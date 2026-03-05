import { performance } from "node:perf_hooks";
import fs from "fs";
import vm from "vm";
import path from "path";

class HeadlessWindow extends EventTarget
{
    constructor()
    {
        super();
        this.performance = performance;
    }
}

export class CablesHeadlessRunner
{

    static OPS_JS_LOCATION = "ops.js";
    static CABLES_JS_LOCATION = "cables.js";

    constructor(patchFile, runningAsCli = true)
    {
        this._cli = runningAsCli;
        this._log = console;
        this._patchFile = patchFile;

        this._dir = path.dirname(patchFile);
        this._opsFile = path.join(this._dir, CablesHeadlessRunner.OPS_JS_LOCATION);
        this._cablesFile = path.join(this._dir, CablesHeadlessRunner.CABLES_JS_LOCATION);
    }

    async run()
    {
        global.window = new HeadlessWindow();

        const cablesCode = fs.readFileSync(this._cablesFile, "utf8");
        const cables = new vm.Script(cablesCode, { "filename": path.basename(this._cablesFile) });
        cables.runInThisContext();

        const opsCode = fs.readFileSync(this._opsFile, "utf8");
        const ops = new vm.Script(opsCode, { "filename": path.basename(this._opsFile) });
        ops.runInThisContext();
        window.Ops = Ops;

        const patchJson = fs.readFileSync(this._patchFile);
        global.window.addEventListener(CABLES.Patch.EVENT_INIT_CGL, (e) =>
        {
            const patch = e.detail;
            patch.renderloop = this._getRenderLoop(patch);
        });
        new CABLES.Patch({
            "patch": patchJson.toString(),
            "onError": this._log.error,
            "doRequestAnimation": false,
            "onFinishedLoading": () =>
            {
                this._log.debug("patch loaded");
            },
        });
    }

    _getRenderLoop(patch)
    {
        const loop = class extends CABLES.RenderLoop
        {

            paused = false;
            frameStartTime = 0;

            #patch;

            #renderOneFrame;
            #animReq;

            frameNum = 0;
            onOneFrameRendered = null;
            _frameNext = 0;
            _frameInterval = 0;
            _lastFrameTime = 0;
            reqAnimTimeStamp = 0;
            _frameWasdelayed = true;
            aborted = false;

            constructor(p)
            {
                super(p);
                this.#patch = p;
                this.#patch.renderloop = this;
                this.exec(0);
            }

            exec(timestamp)
            {
                // super.exec(timestamp);
                this.#patch.config.fpsLimit = this.#patch.config.fpsLimit || 0;
                if (this.#patch.config.fpsLimit)
                {
                    this._frameInterval = 1000 / this.#patch.config.fpsLimit;
                }

                const now = window.performance.now();
                const frameDelta = now - this._frameNext;

                if (this.#patch.isEditorMode())
                {
                    if (!this.#renderOneFrame)
                    {
                        if (now - this._lastFrameTime >= 500 && this._lastFrameTime !== 0 && !this._frameWasdelayed)
                        {
                            this._lastFrameTime = 0;
                            setTimeout(this.exec.bind(this), 500);
                            this.emitEvent("renderDelayStart");
                            this._frameWasdelayed = true;
                            return;
                        }
                    }
                }

                if (this.#renderOneFrame || this.#patch.config.fpsLimit === 0 || frameDelta > this._frameInterval || this._frameWasdelayed)
                {
                    this.renderFrame(timestamp);
                    if (this._frameInterval) this._frameNext = now - (frameDelta % this._frameInterval);
                }

                if (this._frameWasdelayed)
                {
                    this.emitEvent("renderDelayEnd");
                    this._frameWasdelayed = false;
                }

                if (this.#renderOneFrame)
                {
                    if (this.onOneFrameRendered) this.onOneFrameRendered(); // todo remove everywhere and use propper event...
                    this.emitEvent(window.CABLES.Patch.EVENT_RENDERED_ONE_FRAME);
                    this._renderOneFrame = false;
                }

                if (this.#patch.config.doRequestAnimation)
                {
                    this.#animReq = setInterval(() =>
                    {
                        this.exec(this.frameNum);
                    }, 100);
                }
            }

            /**
             * @param {number} timestamp
             */
            renderFrame(timestamp)
            {
                // if (this.paused) return;
                const time = this.#patch.timer.getTime();
                const startTime = performance.now();
                const delta = timestamp - this.reqAnimTimeStamp || timestamp;
                this.#patch.updateAnims(null, delta, timestamp);
                this.reqAnimTimeStamp = timestamp;
                this.#patch.emitEvent(CABLES.Patch.EVENT_RENDER_FRAME, time);

                this.frameNum++;
                if (this.frameNum == 1)
                {
                    if (this.#patch.config.onFirstFrameRendered) this.#patch.config.onFirstFrameRendered();
                }

            }

            pause()
            {
                // super.pause();
                clearInterval(this.#animReq);
                this.#animReq = null;
                this.paused = true;
            }

            resume()
            {
                // super.resume();
                clearInterval(this.#animReq);
                this.paused = false;
                this.exec(0);
            }
        };

        return new loop(patch);
    }
}
