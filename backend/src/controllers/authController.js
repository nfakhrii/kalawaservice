const authService = require('../services/authService');

class AuthController {
  async login(req, res, next) {
    try {
      const { username, password } = req.body;
      const result = await authService.login(username, password);
      return res.status(200).json({
        success: true,
        message: "Login berhasil.",
        data: result,
      });
    } catch (err) {
      return next(err);
    }
  }

  async quickSwitchRole(req, res, next) {
    try {
      const { role } = req.body;
      const result = await authService.quickSwitchRole(role);
      return res.status(200).json({
        success: true,
        message: `Berhasil beralih ke sesi role '${role}'.`,
        data: result,
      });
    } catch (err) {
      return next(err);
    }
  }

  async getDemoUsers(req, res, next) {
    try {
      const users = await authService.getDemoUsers();
      return res.status(200).json({
        success: true,
        data: users,
      });
    } catch (err) {
      return next(err);
    }
  }

  async logout(req, res, next) {
    try {
      await authService.logout(req.user.sid);

      return res.status(200).json({
        success: true,
        message: "Logout berhasil. Sesi PostgreSQL ditutup.",
      });
    } catch (err) {
      return next(err);
    }
  }

  async getMe(req, res) {
    return res.status(200).json({
      success: true,
      data: req.user,
    });
  }
}

module.exports = new AuthController();

