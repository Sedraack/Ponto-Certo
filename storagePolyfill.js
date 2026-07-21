// A app foi construída dentro do Claude, onde existe automaticamente
// um "window.storage" fornecido pela Anthropic. Fora do Claude esse
// objeto não existe — este ficheiro recria o mesmo comportamento
// usando localStorage do próprio browser, para que o resto do
// código (App.jsx) funcione sem qualquer alteração.
//
// Nota importante: ao contrário do window.storage original, isto
// guarda os dados apenas neste browser/dispositivo. Não é partilhado
// entre dispositivos — é exatamente por isso que a app também tem a
// opção de "Sincronização na nuvem" via Supabase, que continua a
// funcionar da mesma forma.

const PREFIX = "pontocerto:";

function makeLocalStorageShim() {
  return {
    async get(key) {
      const raw = window.localStorage.getItem(PREFIX + key);
      if (raw === null) return null;
      return { key, value: raw };
    },
    async set(key, value) {
      try {
        window.localStorage.setItem(PREFIX + key, value);
        return { key, value };
      } catch (e) {
        return null;
      }
    },
    async delete(key) {
      window.localStorage.removeItem(PREFIX + key);
      return { key, deleted: true };
    },
    async list(prefix) {
      const keys = Object.keys(window.localStorage)
        .filter((k) => k.startsWith(PREFIX))
        .map((k) => k.slice(PREFIX.length))
        .filter((k) => !prefix || k.startsWith(prefix));
      return { keys };
    },
  };
}

if (typeof window !== "undefined" && !window.storage) {
  window.storage = makeLocalStorageShim();
}
