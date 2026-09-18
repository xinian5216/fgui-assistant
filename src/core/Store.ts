import { App, joinPath, readTextFile, writeTextFile, fileExists } from '../Api';

interface LocalState {
    ignores: string[];
    protectedAck: { [pkgName: string]: string };
    publish: {
        steps: boolean[];
        lastSvnUpdate: string;
        lastPublish: { time: string; pkg: string; exportPath: string };
    };
    psChecklist: { [docUrl: string]: boolean[] };
    ui: { floatingPos?: { x: number; y: number } };
}

const DEFAULT_STATE: LocalState = {
    ignores: [],
    protectedAck: {},
    publish: { steps: [], lastSvnUpdate: "", lastPublish: null },
    psChecklist: {},
    ui: {}
};

class StoreManager {
    private _state: LocalState = JSON.parse(JSON.stringify(DEFAULT_STATE));
    private _sessionIgnores: string[] = [];
    private _path: string = null;

    load(): void {
        this._state = JSON.parse(JSON.stringify(DEFAULT_STATE));
        this._path = this.statePath();
        if (this._path && fileExists(this._path)) {
            const text = readTextFile(this._path);
            if (text) {
                try {
                    const s = JSON.parse(text);
                    this._state = Object.assign(JSON.parse(JSON.stringify(DEFAULT_STATE)), s);
                } catch (e) { }
            }
        }
    }

    private statePath(): string {
        try {
            if (App.project && App.project.basePath)
                return joinPath(App.project.basePath, "plugins/FGUIAssistant/local.json");
        } catch (e) { }
        try {
            if (App.preferenceFolder) return joinPath(App.preferenceFolder, "FGUIAssistant/local.json");
        } catch (e) { }
        return null;
    }

    save(): void {
        if (!this._path) this._path = this.statePath();
        if (!this._path) return;
        writeTextFile(this._path, JSON.stringify(this._state, null, 2));
    }

    isIgnored(key: string): boolean {
        return this._sessionIgnores.indexOf(key) >= 0 || this._state.ignores.indexOf(key) >= 0;
    }

    ignore(key: string, permanent: boolean): void {
        if (permanent) {
            if (this._state.ignores.indexOf(key) < 0) {
                this._state.ignores.push(key);
                this.save();
            }
        } else {
            if (this._sessionIgnores.indexOf(key) < 0) this._sessionIgnores.push(key);
        }
    }

    clearPermanentIgnores(): number {
        const n = this._state.ignores.length;
        this._state.ignores = [];
        this.save();
        return n;
    }

    get permanentIgnoreCount(): number {
        return this._state.ignores.length;
    }

    ackProtected(pkgName: string): void {
        this._state.protectedAck[pkgName] = new Date().toISOString();
        this.save();
    }

    isProtectedAcked(pkgName: string): boolean {
        return !!this._state.protectedAck[pkgName];
    }

    get publish() { return this._state.publish; }

    setPublishStep(index: number, value: boolean, total: number): void {
        while (this._state.publish.steps.length < total) this._state.publish.steps.push(false);
        this._state.publish.steps[index] = value;
        this.save();
    }

    resetPublishSteps(): void {
        this._state.publish.steps = [];
        this.save();
    }

    markSvnUpdate(): void {
        this._state.publish.lastSvnUpdate = new Date().toISOString();
        this.save();
    }

    markPublish(pkg: string, exportPath: string): void {
        this._state.publish.lastPublish = { time: new Date().toISOString(), pkg: pkg, exportPath: exportPath };
        this.save();
    }

    getPsChecklist(docUrl: string): boolean[] {
        return this._state.psChecklist[docUrl] || [];
    }

    setPsItem(docUrl: string, index: number, value: boolean): void {
        if (!this._state.psChecklist[docUrl]) this._state.psChecklist[docUrl] = [];
        this._state.psChecklist[docUrl][index] = value;
        this.save();
    }

    resetPsChecklist(docUrl: string): void {
        this._state.psChecklist[docUrl] = [];
        this.save();
    }
}

export const Store = new StoreManager();
