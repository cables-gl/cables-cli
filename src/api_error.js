import { HttpError } from "./http_error.js";

export class ApiError extends HttpError
{
    constructor(message, response, errorMessages = [])
    {
        super(message, response);
        this._errorMessages = errorMessages;
    }

    toString()
    {
        let errMessage = super.toString();
        errMessage += this._errorMessages.join("\n");
        return errMessage;
    }
}
