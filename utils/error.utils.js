// error builder for validation errors
export const sequelizeValidationError = (errors) => {
    const err = new Error("Validation failed");
    err.status = 400;
    // if err.path is the same, group the error messages in an array for that field
    err.errors = errors.reduce((acc, err) => {
        if (acc[err.path]) {
            acc[err.path].push(err.message);
        } else {
            acc[err.path] = [err.message];
        }
        return acc;
    }, {});

    return err;
};

// error builder for missing required fields in the request body
export const missingFieldsValidationError = (missingFields) => {
    const err = new Error("Missing required fields");
    err.status = 400;
    // convert array of missing fields to an object with field names as keys 
    err.errors = missingFields.map(field => (
        { [field.toLowerCase()]: `${field} is required` }
    ));
    return err;
};

// error builder for other validation errors
export const validationError = (errors) => {
    const err = new Error("Validation failed");
    err.status = 400;
    err.errors = errors;
    return err;
};

// error 404 - Not Found
export const notFoundError = (resource, id) => {
    resource = resource.toLowerCase();

    const err = new Error("Resource not found");
    err.status = 404;
    err.errors = {
        [resource]: `Resource ${resource} with ID ${id} not found`
    };
    return err;
};

// generic error handler for unexpected errors
export const genericError = (message = "Internal Server Error") => {
    const err = new Error(message);
    err.status = 500;
    return err;
};

// error 409 - Conflict error
export const conflictError = (message) => {
    const err = new Error(message);
    err.status = 409;
    return err; 
};


// error 401 - Unauthorized
// puts access token as null in the response
export const unauthorizedError = (message = "Unauthorized") => {
    const err = new Error(message);
    err.status = 401;
    err.accessToken = null;
    return err
};

// error 403 - Forbidden
export const forbiddenError = (message = "Forbidden") => {
    const err = new Error(message);
    err.status = 403;
    return err
}