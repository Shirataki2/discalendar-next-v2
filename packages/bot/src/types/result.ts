export type ServiceError = {
  code: string;
  message: string;
  details?: string;
};

export type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: ServiceError };
