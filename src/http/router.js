import { randomUUID } from "node:crypto";
import { ValidationError } from "../errors/validation.error.js";

const normalizePath = (path) => {
  const normalized = `/${path ?? ""}`.replace(/\/+/g, "/");
  return normalized.length > 1 ? normalized.replace(/\/$/, "") : normalized;
};

const joinPath = (base, path) =>
  normalizePath(`${base === "/" ? "" : base}/${path === "/" ? "" : path}`);

const matchPath = (pattern, pathname) => {
  const expected = normalizePath(pattern).split("/").filter(Boolean);
  const actual = normalizePath(pathname).split("/").filter(Boolean);
  if (expected.length !== actual.length) return null;

  const params = {};
  for (let index = 0; index < expected.length; index += 1) {
    if (expected[index].startsWith(":")) {
      params[expected[index].slice(1)] = decodeURIComponent(actual[index]);
    } else if (expected[index] !== actual[index]) {
      return null;
    }
  }
  return params;
};

class BunResponse {
  constructor() {
    this.statusCode = 200;
    this.headers = new Headers();
    this.body = undefined;
  }

  status(code) {
    this.statusCode = code;
    return this;
  }

  json(value) {
    this.headers.set("content-type", "application/json; charset=utf-8");
    this.body = JSON.stringify(value);
    return this;
  }

  send(value) {
    this.body = value;
    return this;
  }

  type(contentType) {
    this.headers.set("content-type", contentType);
    return this;
  }

  toResponse() {
    return new Response(this.body ?? null, {
      status: this.statusCode,
      headers: this.headers,
    });
  }
}

const parseBody = async (request) => {
  if (["GET", "HEAD"].includes(request.method)) return {};
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      return await request.json();
    } catch {
      throw new ValidationError("Request body must contain valid JSON");
    }
  }
  if (contentType.includes("application/x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(await request.text()));
  }
  return {};
};

const runHandlers = async (handlers, request, response, index = 0) => {
  if (index >= handlers.length) return;
  let nextPromise;
  const next = (error) => {
    nextPromise = error
      ? Promise.reject(error)
      : runHandlers(handlers, request, response, index + 1);
    return nextPromise;
  };
  await handlers[index](request, response, next);
  if (nextPromise) await nextPromise;
};

export class NativeRouter {
  constructor() {
    this.layers = [];
  }

  use(path, ...handlers) {
    if (typeof path !== "string") {
      handlers.unshift(path);
      path = "/";
    }
    for (const handler of handlers) {
      this.layers.push(
        handler instanceof NativeRouter
          ? { type: "router", path, router: handler }
          : { type: "middleware", handler },
      );
    }
    return this;
  }

  register(method, path, handlers) {
    this.layers.push({ type: "route", method, path, handlers });
    return this;
  }

  get(path, ...handlers) { return this.register("GET", path, handlers); }
  post(path, ...handlers) { return this.register("POST", path, handlers); }
  patch(path, ...handlers) { return this.register("PATCH", path, handlers); }
  delete(path, ...handlers) { return this.register("DELETE", path, handlers); }

  find(method, pathname, base = "/", inherited = []) {
    const middleware = [...inherited];
    for (const layer of this.layers) {
      if (layer.type === "middleware") {
        middleware.push(layer.handler);
        continue;
      }
      if (layer.type === "router") {
        const match = layer.router.find(
          method,
          pathname,
          joinPath(base, layer.path),
          middleware,
        );
        if (match) return match;
        continue;
      }
      if (layer.method !== method) continue;
      const params = matchPath(joinPath(base, layer.path), pathname);
      if (params) return { handlers: [...middleware, ...layer.handlers], params };
    }
    return null;
  }

  async handle(nativeRequest, { errorHandler, notFoundHandler } = {}) {
    const url = new URL(nativeRequest.url);
    const response = new BunResponse();
    const headers = Object.fromEntries(nativeRequest.headers.entries());
    const request = {
      id: randomUUID(),
      method: nativeRequest.method,
      originalUrl: `${url.pathname}${url.search}`,
      headers,
      params: {},
      query: Object.fromEntries(url.searchParams.entries()),
      body: {},
      native: nativeRequest,
    };

    try {
      request.body = await parseBody(nativeRequest);
      const match = this.find(nativeRequest.method, url.pathname);
      if (!match) {
        await notFoundHandler(request, response, (error) => Promise.reject(error));
      } else {
        request.params = match.params;
        await runHandlers(match.handlers, request, response);
      }
    } catch (error) {
      await errorHandler(error, request, response, () => {});
    }

    return response.toResponse();
  }
}

export const Router = () => new NativeRouter();
