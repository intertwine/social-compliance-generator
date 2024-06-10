// types/xenova-transformers.d.ts
type Tokenizer = (prompt: string) => any;

declare module "transformers.js" {
  export class AutoTokenizer {
    static from_pretrained(modelName: string): Promise<Tokenizer>;
  }
  export class MusicgenForConditionalGeneration {
    static from_pretrained(
      modelName: string,
      options?: any
    ): Promise<MusicgenForConditionalGeneration>;
    generate(options: any): Promise<any>;
    config: any;
  }
}
