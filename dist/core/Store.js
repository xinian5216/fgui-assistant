"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Store = void 0;
const Api_1 = require("../Api");
const DEFAULT_STATE = {
    ignores: [],
    protectedAck: {},
    publish: { steps: [], lastSvnUpdate: "", lastPublish: null },
    psChecklist: {},
    ui: {}
};
class StoreManager {
    constructor() {
        this._state = JSON.parse(JSON.stringify(DEFAULT_STATE));
        this._sessionIgnores = [];
        this._path = null;
    }
    load() {
        this._state = JSON.parse(JSON.stringify(DEFAULT_STATE));
        this._path = this.statePath();
        if (this._path && (0, Api_1.fileExists)(this._path)) {
            const text = (0, Api_1.readTextFile)(this._path);
            if (text) {
                try {
                    const s = JSON.parse(text);
                    this._state = Object.assign(JSON.parse(JSON.stringify(DEFAULT_STATE)), s);
                }
                catch (e) { }
            }
        }
    }
    statePath() {
        try {
            if (Api_1.App.project && Api_1.App.project.basePath)
                return (0, Api_1.joinPath)(Api_1.App.project.basePath, "plugins/FGUIAssistant/local.json");
        }
        catch (e) { }
        try {
            if (Api_1.App.preferenceFolder)
                return (0, Api_1.joinPath)(Api_1.App.preferenceFolder, "FGUIAssistant/local.json");
        }
        catch (e) { }
        return null;
    }
    save() {
        if (!this._path)
            this._path = this.statePath();
        if (!this._path)
            return;
        (0, Api_1.writeTextFile)(this._path, JSON.stringify(this._state, null, 2));
    }
    isIgnored(key) {
        return this._sessionIgnores.indexOf(key) >= 0 || this._state.ignores.indexOf(key) >= 0;
    }
    ignore(key, permanent) {
        if (permanent) {
            if (this._state.ignores.indexOf(key) < 0) {
                this._state.ignores.push(key);
                this.save();
            }
        }
        else {
            if (this._sessionIgnores.indexOf(key) < 0)
                this._sessionIgnores.push(key);
        }
    }
    clearPermanentIgnores() {
        const n = this._state.ignores.length;
        this._state.ignores = [];
        this.save();
        return n;
    }
    get permanentIgnoreCount() {
        return this._state.ignores.length;
    }
    ackProtected(pkgName) {
        this._state.protectedAck[pkgName] = new Date().toISOString();
        this.save();
    }
    isProtectedAcked(pkgName) {
        return !!this._state.protectedAck[pkgName];
    }
    get publish() { return this._state.publish; }
    setPublishStep(index, value, total) {
        while (this._state.publish.steps.length < total)
            this._state.publish.steps.push(false);
        this._state.publish.steps[index] = value;
        this.save();
    }
    resetPublishSteps() {
        this._state.publish.steps = [];
        this.save();
    }
    markSvnUpdate() {
        this._state.publish.lastSvnUpdate = new Date().toISOString();
        this.save();
    }
    markPublish(pkg, exportPath) {
        this._state.publish.lastPublish = { time: new Date().toISOString(), pkg: pkg, exportPath: exportPath };
        this.save();
    }
    getPsChecklist(docUrl) {
        return this._state.psChecklist[docUrl] || [];
    }
    setPsItem(docUrl, index, value) {
        if (!this._state.psChecklist[docUrl])
            this._state.psChecklist[docUrl] = [];
        this._state.psChecklist[docUrl][index] = value;
        this.save();
    }
    resetPsChecklist(docUrl) {
        this._state.psChecklist[docUrl] = [];
        this.save();
    }
}
exports.Store = new StoreManager();
