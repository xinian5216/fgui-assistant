declare var console: {
    log(...args: any[]): void;
    warn(...args: any[]): void;
    error(...args: any[]): void;
    info(...args: any[]): void;
};

declare function require(name: string): any;
declare var module: { exports: any };
declare var exports: any;
