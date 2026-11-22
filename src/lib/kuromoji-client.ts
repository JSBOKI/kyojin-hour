import { withBase } from "./base-path";

type KuromojiToken = {
  surface_form: string;
  reading?: string;
  basic_form?: string;
  pos: string;
};

type KuromojiApi = {
  builder: (options: { dicPath: string }) => {
    build: (callback: (error: Error | null, tokenizer: { tokenize: (text: string) => KuromojiToken[] }) => void) => void;
  };
};

declare global {
  interface Window {
    kuromoji?: KuromojiApi;
  }
}

let loading: Promise<{ tokenize: (text: string) => KuromojiToken[] }> | null = null;

/**
 * Load the browser build of kuromoji and its gzipped dictionary from
 * /kuromoji under the GitHub Pages base path.
 */
export function loadKuromoji() {
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const dicPath = withBase("/kuromoji");
      const start = (api: KuromojiApi | undefined) => {
        if (!api) {
          reject(new Error("Kuromoji did not load."));
          return;
        }
        api.builder({ dicPath }).build((error, tokenizer) => {
          if (error) reject(error);
          else resolve(tokenizer);
        });
      };
      if (window.kuromoji) {
        start(window.kuromoji);
        return;
      }
      const script = document.createElement("script");
      script.src = withBase("/kuromoji/kuromoji.js");
      script.async = true;
      script.onload = () => start(window.kuromoji);
      script.onerror = () => reject(new Error("Could not load kuromoji.js."));
      document.body.appendChild(script);
    });
  }
  return loading;
}
