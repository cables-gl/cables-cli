import { CablesCLI } from "./new.js";

const cables = new CablesCLI();
cables.export({
    "patch": ["99CJma"],
    "destination": "test",
    "url": "http://dev.cables.local",
})
    .then((result) =>
    {
        console.log("Export finished!", result.log.map((l) => { return l.message; }));
    })
    .catch((e) =>
    {
        console.log("There was an error exporting your patch :/", e.toString());
    });
