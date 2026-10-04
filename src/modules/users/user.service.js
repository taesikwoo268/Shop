import { NotFoundError } from "../../errors/not-found.error.js";
import { UnauthorizedError } from "../../errors/unauthorized.error.js";
import { comparePassword, hashPassword } from "../../utils/password.js";

const toPublicUser = (user) => ({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  status: user.status,
  role: user.role.name,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export class UserService {
  constructor(repository) {
    this.repository = repository;
  }

  async getProfile(userId) {
    const user = await this.repository.findById(userId);
    if (!user) throw new NotFoundError("User not found");

    return toPublicUser(user);
  }

  async updateProfile(userId, data) {
    const user = await this.repository.updateProfile(userId, data);
    return toPublicUser(user);
  }

  async changePassword(userId, { currentPassword, newPassword }) {
    const user = await this.repository.findById(userId);
    if (!user) throw new NotFoundError("User not found");

    if (!(await comparePassword(currentPassword, user.passwordHash))) {
      throw new UnauthorizedError("Current password is incorrect");
    }

    await this.repository.changePassword(userId, await hashPassword(newPassword));
  }

  listAddresses(userId) {
    return this.repository.listAddresses(userId);
  }

  createAddress(userId, data) {
    return this.repository.createAddress(userId, data);
  }

  async updateAddress(userId, addressId, data) {
    const address = await this.repository.updateAddress(userId, addressId, data);
    if (!address) throw new NotFoundError("Address not found");
    return address;
  }

  async deleteAddress(userId, addressId) {
    const address = await this.repository.deleteAddress(userId, addressId);
    if (!address) throw new NotFoundError("Address not found");
  }

  async setDefaultAddress(userId, addressId) {
    const address = await this.repository.setDefaultAddress(userId, addressId);
    if (!address) throw new NotFoundError("Address not found");
    return address;
  }
}
