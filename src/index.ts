import homeNode from './nodes.json';

interface Node {
    name: string;
    head?: string;
    body?: string;
    link?: string;
    parent?: Node;
    children?: Node[];
}

class Command {

    private currentNode: Node = homeNode;
    private readonly handlerMap: Map<string, (argument: string) => string> = new Map();

    public constructor() {
        this.handlerMap.set('ls', this.handleList.bind(this));
        this.handlerMap.set('cd', this.handleChangeDirectory.bind(this));
        this.handlerMap.set('cat', this.handleConcatenate.bind(this));
        this.handlerMap.set('echo', this.handleEcho.bind(this));
        this.handlerMap.set('pwd', this.handlePrintWorkingDirectory.bind(this));

        const setParentNode = (node: Node) => {
            node.children?.forEach(child => {
                child.parent = node;
                setParentNode(child);
            });
        }
        setParentNode(homeNode);
    }

    public currentDir(): string {
        return this.currentNode.name;
    }

    public execute(command: string) {
        const program = command.split(' ')[0];
        const argument = command.split(' ').slice(1).join(' ');
        const handler = this.handlerMap.get(program);
        if (!handler) {
            return `bash: command not found: ${program}`;
        }
        return handler(argument);
    }

    private findNodeFromPath(node: Node, path: string): Node | undefined {
        if (path == '') return node;
        const targetNames = path.split('/');
        const findNodeFromPathSub = (node: Node, depth: number): Node | undefined => {
            if (depth == targetNames.length) return node;
            const targetNode = node.children?.find(node => node.name == targetNames[depth]);
            return targetNode && findNodeFromPathSub(targetNode, depth + 1);
        };
        return findNodeFromPathSub(node, 0);
    }

    private findPathFromNode(node: Node): string {
        if (!node.parent) return node.name;
        return `${this.findPathFromNode(node.parent)}/${node.name}`;
    }

    private parseNonOptionArgument(argument: string): string {
        return argument.split(' ').filter(item => !item.startsWith('-')).join(' ').trim();
    }

    private parseLongOptions(argument: string): string[] {
        return argument.split(' ').filter(item => item.startsWith('--')).map(item => item.slice(2));
    }

    private parseShortOptions(argument: string): string[] {
        return argument.split(' ').filter(item => item.startsWith('-') && !item.startsWith('--')).flatMap(item => item.slice(1).split(''))
    }

    private parseLongAndShortOptions(argument: string): string[] {
        return this.parseLongOptions(argument).concat(this.parseShortOptions(argument));
    }

    private matchOptions(targets: string[], options: string[]): boolean {
        return targets.some(target => options.includes(target));
    }

    private handleList(argument: string): string {
        const options = this.parseLongAndShortOptions(argument);
        const all = this.matchOptions(['a', 'all'], options);
        const long = this.matchOptions(['l'], options);
        const targetPath = this.parseNonOptionArgument(argument);
        const targetNode = this.findNodeFromPath(this.currentNode, targetPath);
        if (!targetNode) {
            return `ls: No such file or directory: ${targetPath}`;
        }
        const targets = targetNode?.children!.filter(node => all || !node.name.startsWith('.'));
        const displayName = (node: Node) => node.name.includes(' ') ? `'${node.name}'` : node.name;
        const displayLink = (node: Node) => node.link ? `-> <a target="_blank" href="${node.link}">${node.link}</a>` : '';
        return long
            ? targets.map(node => `${node.head} ${displayName(node)} ${displayLink(node)}`).join('\n')
            : targets.map(node => displayName(node)).join(' ');
    }

    private handleChangeDirectory(argument: string): string {
        if (argument == './') return '';
        if (argument == '../' && this.currentNode.parent) {
            this.currentNode = this.currentNode.parent;
            return '';
        }
        const targetNode = this.findNodeFromPath(this.currentNode, argument);
        if (targetNode) {
            this.currentNode = targetNode;
            return '';
        }
        return `cd: No such file or directory: ${argument}`;
    }

    private handleConcatenate(argument: string): string {
        const targetNode = this.findNodeFromPath(this.currentNode, argument);
        if (targetNode) {
            if (targetNode.body) return targetNode.body;
            return `cat: ${argument} is a directory.`;
        }
        return `cat: No such file or directory: ${argument}`;
    }

    private handleEcho(argument: string): string {
        return argument;
    }

    private handlePrintWorkingDirectory(argument: string): string {
        if (argument == '') {
            return this.findPathFromNode(this.currentNode);
        }
        return 'pwd: Too many arguments.';
    }
}

class Console {

    private readonly command: Command = new Command();
    private readonly listElement: HTMLOListElement = document.querySelector('#console') as HTMLOListElement;
    private readonly itemElement: HTMLLIElement = this.listElement.querySelector('li') as HTMLLIElement;
    private readonly inputElement: HTMLInputElement = this.itemElement.querySelector('input') as HTMLInputElement;
    private readonly statusElement: HTMLSpanElement = this.itemElement.querySelector('span') as HTMLSpanElement;

    public async initialize() {
        await this.typeCommand('ls -l');
        this.executeCommand();
        await this.typeCommand('cat README.md');
        this.executeCommand();
        this.inputElement.focus();
        this.inputElement.addEventListener('keydown', event => {
            if (event.key === 'Enter') {
                this.executeCommand();
            }
        });
    }

    private async typeCommand(command: string) {
        const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
        for (let i = 0; i < command.length; i++) {
            await wait(200);
            this.inputElement.value += command[i];
        }
    }

    private executeCommand() {
        const liElement = document.createElement('li');
        const codeElement = document.createElement('code');
        const value = this.inputElement.value; this.inputElement.value = '';
        codeElement.innerHTML = `$ ${this.command.currentDir()} ${value}\n${this.command.execute(value)}`
        this.statusElement.innerText = this.command.currentDir();
        this.listElement.insertBefore(liElement, this.itemElement);
        liElement.appendChild(codeElement);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new Console().initialize();
});
