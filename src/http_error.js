export class HttpError extends Error
{
    constructor(message, response)
    {
        super(message);
        this.message = this.stripHtmlRegex(message);
        this.response = response;
    }

    toString()
    {
        let errMessage;
        switch (this.response.status)
        {
        case 500:
            errMessage = "unknown error, maybe try again.";
            break;
        case 404:
            errMessage = "unknown patch, check patchid and url.";
            break;
        case 422:
            errMessage = "incomplete export, missing ops";
            break;
        case 403:
            errMessage = "insufficient rights for patch export, or over quota";
            break;
        case 401:
            errMessage = "insufficient rights for patch export, invalid api key?";
            break;
        case 400:
            errMessage = "no rights to patch, invalid api key";
            break;
        case 200:
            break;
        default:
            errMessage = "invalid response\n";
            errMessage += "code: " + this.response.status + "\n";
            errMessage += "body: " + this.response.body;
            break;
        }

        return "Error fetching patch: " + errMessage;
    }

    stripHtmlRegex(html) {
        return html.replace(/<[^>]*>/g, '');
    }
}
