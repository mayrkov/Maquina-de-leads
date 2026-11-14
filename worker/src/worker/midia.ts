/**
 * Disco de mídia compartilhado com o Laravel (disco "midia" em app/config/filesystems.php): o payload traz chaves
 * relativas ("brutos/1/abc.mp4") e o worker as resolve dentro de MIDIA_ROOT.
 * shortcut: pasta compartilhada; vira bucket compatível com S3 (D3) quando o worker for para outra máquina.
 */
import { isAbsolute, normalize, resolve, sep } from "node:path";

export function midiaRoot(): string {
  const root = process.env.MIDIA_ROOT?.trim();
  if (!root) throw new Error("Defina MIDIA_ROOT (a mesma pasta do disco 'midia' do Laravel)");
  return resolve(root);
}

/** Caminho absoluto de uma chave, recusando qualquer chave que saia da pasta de mídia. */
export function caminhoDaChave(root: string, chave: string): string {
  const limpa = normalize(chave);
  if (!chave || isAbsolute(chave) || limpa.startsWith("..") || limpa.split(sep).includes("..")) {
    throw new Error(`Chave de arquivo inválida: "${chave}"`);
  }
  const caminho = resolve(root, limpa);
  if (!caminho.startsWith(root + sep)) throw new Error(`Chave de arquivo fora da pasta de mídia: "${chave}"`);
  return caminho;
}
