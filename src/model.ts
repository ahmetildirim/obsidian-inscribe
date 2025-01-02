import { Suggestion } from "codemirror-companion-extension";


export interface Model {
    id : string;
    name : string;
    description : string;
    generate : (prefix : string, suffix : string) => AsyncGenerator<Suggestion>;
    load : () => Promise<void>;
    abort : () => void;
}