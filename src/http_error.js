export class HttpError extends Error {
    constructor(message, response) {
        super(message);
        this.response = response;
    }

    toString() {
        let errMessage;
        switch (this.response.status)
        {
        case 500:
            errMessage = "unknown error, maybe try again.";
            break;
        case 404:
            errMessage = "unknown patch, check patchid.";
            break;
        case 403:
            errMessage = "insufficient rights for patch export, or over quota";
            break;
        case 401:
            errMessage = "insufficient rights for patch export";
            break;
        case 400:
            errMessage = "no rights to patch, invalid api key";
            break;
        default:
            errMessage = "invalid response\n";
            errMessage += "code: " + this.response.status + "\n";
            errMessage += "body: " + this.response.body;
            break;
        }

        return "Error fetching patch: " + errMessage;
    }
}
