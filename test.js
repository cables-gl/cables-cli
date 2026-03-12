import { Cables } from "./index.js";

const cables = new Cables();

await cables.upload({
    "patch": "kram",
    "file": "bla"
});

cables.export({
    "patch": "99CJma",
    "destination": "test",
    "apikey": "2a6127c4811194e960f2904cf0a771802216415c63bbd07152d83a90f3a5398eed10e3e577e1418d2f4509091cf011d2", // local key
    "url": "https://dev.cables.local",
})
    .then((result) =>
    {
        console.log("Export finished!", result.log.map((l) => { return l.message; }));
    })
    .catch((e) =>
    {
        console.log("There was an error exporting your patch :/", e.toString());
    });
