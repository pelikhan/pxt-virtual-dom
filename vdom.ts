namespace vdom {
    const noProperties: any = {};
    const noChildren: VirtualNode[] = [];

    export class Node {
        constructor() { }
    }

    export interface VirtualHook {
        hook(): void;
        unhook(): void;
    }

    function isVHook(hook: any): boolean {
        return hook && hook.hook && hook.unhook;
    }

    export class VirtualNode extends Node {
        public count: number;
        public descendants: number;
        public hasWidgets: boolean;
        public hasThunks: boolean;
        public descendantHooks: boolean;
        public hooks: { [index: string]: VirtualHook };

        constructor(
            public tagName: string,
            public properties: any,
            public children: VirtualNode[],
            public key: string,
            public namespace: string
        ) {
            super();
            this.properties = this.properties || noProperties;
            this.children = this.children || noChildren;

            let count = (children && children.length) || 0
            let descendants = 0
            let hasWidgets = false
            let hasThunks = false
            let descendantHooks = false
            let hooks: { [index: string]: VirtualHook } = undefined;

            const keys = Object.keys(properties);
            for (const propName of keys) {
                const property = properties[propName];
                if (property !== undefined) {
                    if (isVHook(property) && property.unhook) {
                        if (!hooks) {
                            hooks = {}
                        }
                        hooks[propName] = property as VirtualHook;
                    }
                }
            }

            for (let i = 0; i < count; i++) {
                let child = children[i]
                if (isVNode(child)) {
                    const vchild = child as VirtualNode;
                    descendants += vchild.count || 0

                    if (!hasWidgets && vchild.hasWidgets) {
                        hasWidgets = true
                    }

                    if (!hasThunks && vchild.hasThunks) {
                        hasThunks = true
                    }

                    if (!descendantHooks && (!!vchild.hooks || vchild.descendantHooks)) {
                        descendantHooks = true
                    }
                } else if (!hasWidgets && isWidget(child)) {
                    hasWidgets = true
                } else if (!hasThunks && isThunk(child)) {
                    hasThunks = true;
                }
            }

            this.count = count + descendants;
            this.hasWidgets = hasWidgets;
            this.hasThunks = hasThunks;
            this.hooks = hooks;
            this.descendantHooks = descendantHooks;
        }
    }

    export function isVNode(x: Node) {
        return x && x instanceof VirtualNode;
    }

    export class Thunk extends Node {
        public vnode: Node;
        constructor() {
            super();
        }
        render(previous: Node): Node {
            return undefined;
        }
    }

    export function isThunk(t: Node): boolean {
        return t && t instanceof Thunk;
    }

    export function handleThunk(a: Node, b: Node): { a: Node, b: Node } {
        let renderedA = a
        let renderedB = b

        if (isThunk(b)) {
            renderedB = renderThunk(b as Thunk, a)
        }

        if (isThunk(a)) {
            renderedA = renderThunk(a as Thunk, null)
        }

        return {
            a: renderedA,
            b: renderedB
        }
    }

    function renderThunk(thunk: Thunk, previous: Node): Node {
        let renderedThunk = thunk.vnode

        if (!renderedThunk) {
            renderedThunk = thunk.vnode = thunk.render(previous)
        }

        if (!(isVNode(renderedThunk) ||
            isVText(renderedThunk) ||
            isWidget(renderedThunk))) {
            control.fail("thunk did not return a valid node");
        }

        return renderedThunk
    }

    export class VirtualText extends Node {
        constructor(public text: string) {
            super();
        }
    }

    export function isVText(x: Node): boolean {
        return x && x instanceof VirtualText;
    }

    export class Widget extends Node {
        constructor() {
            super();
        }
        init() { }
        update(previous: Node, domNode: any) { }
        destroy(domNode: any) { }
    }

    export function isWidget(w: Node): boolean {
        return w && w instanceof Widget;
    }

    export const enum VirtualPatchType {
        NONE = 0,
        VTEXT = 1,
        VNODE = 2,
        WIDGET = 3,
        PROPS = 4,
        ORDER = 5,
        INSERT = 6,
        REMOVE = 7,
        THUNK = 8
    }

    export class VirtualPatch {
        constructor(
            public type: VirtualPatchType,
            public vNode: VirtualNode,
            public patch: any
        ) {
        }
    }
} 