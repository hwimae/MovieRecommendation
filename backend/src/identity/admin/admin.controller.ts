import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { AdminUserIdParam, ListAdminUsersQuery } from './admin.schema';
import type { AdminService } from './admin.service';

export type AdminController = {
  listUsers: RequestHandler<Record<string, string>, unknown, unknown, ListAdminUsersQuery>;
  approveUser: RequestHandler<AdminUserIdParam>;
  rejectUser: RequestHandler<AdminUserIdParam>;
};

export function createAdminController(adminService: AdminService): AdminController {
  return {
    async listUsers(
      req: Request<Record<string, string>, unknown, unknown, ListAdminUsersQuery>,
      res: Response,
      next: NextFunction,
    ) {
      try {
        res.json(await adminService.listUsers(req.query));
      } catch (error) {
        next(error);
      }
    },

    async approveUser(req: Request<AdminUserIdParam>, res: Response, next: NextFunction) {
      try {
        res.json(await adminService.approveUser(req.user!.id, req.params.id));
      } catch (error) {
        next(error);
      }
    },

    async rejectUser(req: Request<AdminUserIdParam>, res: Response, next: NextFunction) {
      try {
        res.json(await adminService.rejectUser(req.user!.id, req.params.id));
      } catch (error) {
        next(error);
      }
    },
  };
}
