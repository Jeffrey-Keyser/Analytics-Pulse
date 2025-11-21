import {
  ApiError,
  NotFoundError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  createNotFoundError,
  createValidationError,
} from "../../../../utils/errors";

describe("Error Classes", () => {
  describe("ApiError", () => {
    it("should create an error with message and status code", () => {
      const error = new ApiError(400, "TEST_ERROR", "Test error");

      expect(error.message).toBe("Test error");
      expect(error.status).toBe(400);
      expect(error.code).toBe("TEST_ERROR");
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ApiError);
    });

    it("should have default status code of 500", () => {
      const error = new ApiError(500, "INTERNAL_SERVER_ERROR", "Server error");

      expect(error.status).toBe(500);
      expect(error.code).toBe("INTERNAL_SERVER_ERROR");
    });

    it("should include validation errors and metadata", () => {
      const validationErrors = [
        { field: "email", message: "Invalid email format" },
      ];
      const metadata = { field: "email" };
      const error = new ApiError(
        400,
        "VALIDATION_ERROR",
        "Validation failed",
        validationErrors,
        metadata
      );

      expect(error.validationErrors).toEqual(validationErrors);
      expect(error.metadata).toEqual(metadata);
    });
  });

  describe("NotFoundError", () => {
    it("should create a 404 error", () => {
      const error = new NotFoundError("User", "123");

      expect(error.message).toBe("User with id '123' not found");
      expect(error.status).toBe(404);
      expect(error.code).toBe("RESOURCE_NOT_FOUND");
      expect(error).toBeInstanceOf(NotFoundError);
      expect(error).toBeInstanceOf(ApiError);
    });

    it("should create error with helper function", () => {
      const error = createNotFoundError("User", "123");

      expect(error.message).toBe("User with id '123' not found");
      expect(error.status).toBe(404);
    });
  });

  describe("ValidationError", () => {
    it("should create a 400 validation error", () => {
      const validationErrors = [{ field: "email", message: "Required field" }];
      const error = new ValidationError("Invalid input", validationErrors);

      expect(error.message).toBe("Invalid input");
      expect(error.status).toBe(400);
      expect(error.code).toBe("VALIDATION_ERROR");
      expect(error.validationErrors).toEqual(validationErrors);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error).toBeInstanceOf(ApiError);
    });

    it("should create error with helper function", () => {
      const errors = [
        { field: "password", message: "Too short" },
        { field: "password", message: "Must contain numbers" },
      ];
      const error = createValidationError(errors);

      expect(error.message).toBe("Multiple validation errors occurred");
      expect(error.validationErrors).toEqual(errors);
    });
  });

  describe("AuthenticationError", () => {
    it("should create a 401 authentication error", () => {
      const error = new AuthenticationError("Invalid credentials");

      expect(error.message).toBe("Invalid credentials");
      expect(error.status).toBe(401);
      expect(error.code).toBe("AUTHENTICATION_ERROR");
      expect(error).toBeInstanceOf(AuthenticationError);
      expect(error).toBeInstanceOf(ApiError);
    });
  });

  describe("AuthorizationError", () => {
    it("should create a 403 authorization error", () => {
      const error = new AuthorizationError("Access denied");

      expect(error.message).toBe("Access denied");
      expect(error.status).toBe(403);
      expect(error.code).toBe("AUTHORIZATION_ERROR");
      expect(error).toBeInstanceOf(AuthorizationError);
      expect(error).toBeInstanceOf(ApiError);
    });
  });
});
