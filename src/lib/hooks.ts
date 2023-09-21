type HookFunction = (
  data: unknown,
  result: Record<string, unknown>
) => Promise<Record<string, unknown> | void> | Record<string, unknown> | void;

class Hooks {
  _hooks: Map<string, HookFunction[]> = new Map();

  register(hookName: string) {
    if (this._hooks.get(hookName))
      throw new Error(`hooks.register("${hookName}") but hook already exists`);
    this._hooks.set(hookName, []);
  }

  on(hookName: string, func: HookFunction) {
    const hooks = this._hooks.get(hookName);

    if (!hooks)
      throw new Error(
        `hooks.on("${hookName}") called, but no such hook exists`
      );

    hooks.push(func);
  }

  async exec(hookName: string, data?: unknown) {
    const hooks = this._hooks.get(hookName);
    if (!hooks)
      throw new Error(
        `hooks.exec("${hookName}") called, but no such hook exists`
      );

    let result = {};
    for (const hook of hooks) {
      try {
        result = { ...result, ...(await hook(data, result)) };
      } catch (error) {
        console.error(
          `hooks.exec("${hookName}"): the following hook error was caught and SKIPPED!`
        );
        if (error instanceof Error) console.error(error.stack);
        else console.error(error);
      }
    }

    return result;
  }
}

const hooks = new Hooks();

export default hooks;
