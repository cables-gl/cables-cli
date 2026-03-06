import { CablesCLI } from "./new.js";

const cables = new CablesCLI();
cables.export({
    "patch": ["99CJma"],
    "destination": "test",
    "url": "http://dev.cables.local"
}).then(() => {
    console.log("Export finished!");
}).catch((e) => {
    console.log("There was an error exporting your patch :/", e.toString());
});
