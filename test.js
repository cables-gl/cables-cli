import { Cables } from "./index.js";

const cables = new Cables();

cables.upload({
    "patch": "w2QORe",
    "file": "./patch/screenshot.png"
}).then((r) => {
    console.log("R", r);
});


