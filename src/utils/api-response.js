export const sendSuccess = (
  response,
  { statusCode = 200, message = "Success", data } = {},
) => {
  const body = { success: true, message };

  if (data !== undefined) {
    body.data = data;
  }

  return response.status(statusCode).json(body);
};

export const sendError = (
  response,
  { statusCode = 500, message = "Internal server error", details } = {},
) => {
  const body = { success: false, message };

  if (details !== undefined) {
    body.details = details;
  }

  return response.status(statusCode).json(body);
};
