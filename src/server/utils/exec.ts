import { spawn } from "node:child_process";

export interface SpawnOptions {
    cwd?: string;
    encoding?: BufferEncoding;
}

export interface SpawnResult {
    stdout: string;
    stderr: string;
    code: number | null;
}

/**
 * Error thrown when a spawned process exits with a non-zero code or fails to
 * start. Carries the captured `stdout`/`stderr` so callers can surface output.
 */
export class SpawnError extends Error {
    code : number | null;
    stdout : string;
    stderr : string;

    constructor(message : string, code : number | null, stdout : string, stderr : string) {
        super(message);
        this.name = "SpawnError";
        this.code = code;
        this.stdout = stdout;
        this.stderr = stderr;
    }
}

/**
 * Run a command and resolve with its captured output, rejecting when it exits
 * with a non-zero code or cannot be started.
 * @param command Executable to run
 * @param args Arguments to pass to the executable
 * @param options Working directory and output encoding
 * @returns The process output and exit code
 */
export function spawnAsync(command : string, args : string[] = [], options : SpawnOptions = {}) : Promise<SpawnResult> {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            cwd: options.cwd,
        });

        const stdoutChunks : Buffer[] = [];
        const stderrChunks : Buffer[] = [];

        child.stdout.on("data", (chunk : Buffer) => stdoutChunks.push(chunk));
        child.stderr.on("data", (chunk : Buffer) => stderrChunks.push(chunk));

        child.on("error", (error) => {
            reject(new SpawnError(error.message, null, "", ""));
        });

        child.on("close", (code) => {
            const encoding = options.encoding ?? "utf-8";
            const stdout = Buffer.concat(stdoutChunks).toString(encoding);
            const stderr = Buffer.concat(stderrChunks).toString(encoding);

            if (code === 0) {
                resolve({
                    stdout,
                    stderr,
                    code,
                });
            } else {
                reject(new SpawnError(`Process exited with code ${code}`, code, stdout, stderr));
            }
        });
    });
}
