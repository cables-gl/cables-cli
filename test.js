import { Cables } from "./index.js";

const cables = new Cables();

cables.upload({
    "patch": "DsUx2h",
    "file": "/Users/stephan/Downloads/effect.json",
    "apikey": "2a6127c4811194e960f2904cf0a771802216415c63bbd07152d83a90f3a5398eed10e3e577e1418d2f4509091cf011d2"
}).then((r) => {
    console.log("R", r);
});


