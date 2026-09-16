/**
 * Place les fichiers du moteur de lecture de la pièce dans
 * public/ocr/<DOSSIER_OCR>/, d'où Vite les recopie tels quels dans dist/ocr/.
 *
 * Pourquoi servir ces fichiers nous-mêmes : par défaut, tesseract.js va
 * chercher son worker, son cœur WASM et ses modèles sur jsDelivr. Chaque
 * personne qui déclare une pièce donnerait alors son adresse IP à un tiers, au
 * moment précis où elle photographie une pièce d'identité. Ici, tout part de
 * pieci.ci et le code de lecture pointe sur ce dossier (voir
 * src/lib/lecture/moteur.ts).
 *
 * Pourquoi un script plutôt que des fichiers commités : le cœur pèse près de
 * 4 Mo par variante. On ne commite que ce qui ne vient pas de npm (le modèle
 * « mrz », dans vendor/ocr/) ; le reste est pris dans node_modules, où npm l'a
 * installé à version exacte, et le dossier produit est ignoré par git
 * (public/ocr/.gitignore).
 *
 * Ce que le script garantit, sans option pour passer outre :
 *
 * - les versions installées sont exactement celles de VERSIONS, qui sont
 *   aussi celles déclarées dans package.json ;
 * - chaque fichier copié a l'empreinte SHA-256 relevée à l'installation
 *   (le modèle « mrz » : celle du fichier publié par son auteur, voir
 *   vendor/ocr/PROVENANCE.txt). Une empreinte qui change, c'est un fichier
 *   qui n'est plus celui qu'on a mesuré : le build s'arrête ;
 * - aucun fichier ne dépasse la limite de 25 Mio par fichier statique de
 *   Cloudflare Workers ;
 * - les dossiers d'une version précédente sont retirés de public/ocr/, pour
 *   ne jamais déployer deux moteurs.
 *
 * Lancé par npm avant `build` et `dev` (scripts prebuild et predev). Idempotent :
 * un fichier déjà en place et identique n'est pas réécrit.
 *
 *   node scripts/copier-ocr.mjs
 *
 * Le nom du dossier est exporté pour vite.config.ts : c'est lui qui le transmet
 * au code de lecture et au service worker. Une seule définition, trois
 * consommateurs qui ne peuvent pas diverger.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { constants as zlib, gunzipSync, gzipSync } from 'node:zlib';

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Versions exactes du moteur. Doivent être celles de package.json, sans
 * préfixe ^ ni ~ : une mise à jour du moteur change les résultats de lecture,
 * elle se décide et se mesure, elle ne s'installe pas toute seule.
 */
export const VERSIONS = Object.freeze({
  'tesseract.js': '7.0.0',
  'tesseract.js-core': '7.0.0',
  '@tesseract.js-data/fra': '1.0.0',
});

/**
 * Suffixe à incrémenter (« -r2 », « -r3 »…) quand un fichier change sans que
 * la version de tesseract.js change — typiquement un modèle. Le nom du dossier
 * est la clé du cache des téléphones (service worker) : sans nouveau nom, ceux
 * qui ont déjà l'ancien fichier le garderaient.
 */
export const REVISION = '';

/** Nom du dossier servi sous /ocr/. */
export const DOSSIER_OCR = `tesseract-${VERSIONS['tesseract.js']}${REVISION}`;

/** Limite par fichier statique des Workers Cloudflare (developers.cloudflare.com/workers/platform/limits). */
const TAILLE_MAX = 25 * 1024 * 1024;

const vendor = (nom) => join(racine, 'vendor', 'ocr', nom);

/** Chemin d'un fichier dans un paquet installé, quel que soit l'endroit où npm l'a hissé. */
function dansPaquet(paquet, chemin) {
  const require = createRequire(join(racine, 'package.json'));
  return join(dirname(require.resolve(`${paquet}/package.json`)), chemin);
}

/**
 * Fichiers servis. `sha256` porte sur la SOURCE, octet pour octet.
 *
 * Le cœur existe en trois variantes « -lstm » : tesseract.js choisit à
 * l'exécution selon ce que le processeur sait faire (relaxed SIMD, SIMD, ni
 * l'un ni l'autre). Les trois doivent être là ; un téléphone n'en télécharge
 * qu'une. Les variantes sans « -lstm » embarquent l'ancien moteur, qu'on
 * n'utilise pas.
 *
 * `fra` est le modèle « best_int » : « fast » perd les prénoms (3 fois sur 3
 * mesurées), les modèles flottants plantent le cœur.
 */
const FICHIERS = [
  {
    nom: 'worker.min.js',
    source: () => dansPaquet('tesseract.js', 'dist/worker.min.js'),
    sha256: '576b7df7e3393e137e51849357c9adb53fe7ac1bb69bfa06cf3d61520f182c6d',
  },
  {
    nom: 'tesseract-core-lstm.wasm.js',
    source: () => dansPaquet('tesseract.js-core', 'tesseract-core-lstm.wasm.js'),
    sha256: 'eef5f8b2f8e20e150680b20adaec4a60babafee3adbe8a94583c81fee46e8680',
  },
  {
    nom: 'tesseract-core-simd-lstm.wasm.js',
    source: () => dansPaquet('tesseract.js-core', 'tesseract-core-simd-lstm.wasm.js'),
    sha256: 'c58b46a4c796c0b8afccf77591d5b875b6896b45d402bbce8caa6f5362447b38',
  },
  {
    nom: 'tesseract-core-relaxedsimd-lstm.wasm.js',
    source: () => dansPaquet('tesseract.js-core', 'tesseract-core-relaxedsimd-lstm.wasm.js'),
    sha256: '861a536cf9ef8e63cb644d57bab39c388f37f7d6b6f60024b741c5f6b39a59b3',
  },
  {
    nom: 'fra.traineddata.gz',
    source: () => dansPaquet('@tesseract.js-data/fra', '4.0.0_best_int/fra.traineddata.gz'),
    sha256: 'd611139672b3752c7097e671e4a1d9209dfd37f2aeb081ef6487fba3351e9255',
  },
  {
    // Le dépôt d'origine publie le modèle non compressé ; on garde ces octets-là
    // dans vendor/ (empreinte vérifiable contre la source) et on compresse ici.
    // tesseract.js reconnaît le gzip à ses deux premiers octets.
    nom: 'mrz.traineddata.gz',
    source: () => vendor('mrz.traineddata'),
    sha256: 'ece2a54f125a73792f9cec74e6f8e62f6e5e00c7f19153ba865af689be5b5f01',
    gzip: true,
  },
];

/** Textes de licence recopiés dans LICENCES.txt, vérifiés comme le reste. */
const LICENCES = {
  apache: {
    source: () => dansPaquet('tesseract.js', 'LICENSE.md'),
    sha256: 'b40930bbcf80744c86c46a12bc9da056641d722716c378f5659b9e555ef833e1',
  },
  avisWorker: {
    source: () => dansPaquet('tesseract.js', 'dist/worker.min.js.LICENSE.txt'),
    sha256: '45f54171aeaa1d10c0c1a66f374b7bba1f02472b1487fbe892eec04f840002ac',
  },
  bsdMrz: {
    source: () => vendor('LICENSE-tesseractMRZ.txt'),
    sha256: '2b43756e513c505edd233a60ebe94bd7596de9bea2419e12391632b6efeecb3c',
  },
};

class ErreurCopie extends Error {}

const empreinte = (octets) => createHash('sha256').update(octets).digest('hex');

/** Lit une source et vérifie son empreinte ; lève une erreur explicite sinon. */
function lireVerifie({ source, sha256 }, libelle) {
  const chemin = source();
  if (!existsSync(chemin)) {
    throw new ErreurCopie(`${libelle} : introuvable (${chemin}). Lancer « npm ci » dans app/.`);
  }
  const octets = readFileSync(chemin);
  const obtenue = empreinte(octets);
  if (obtenue !== sha256) {
    throw new ErreurCopie(
      `${libelle} : empreinte SHA-256 inattendue.\n  attendue : ${sha256}\n  obtenue  : ${obtenue}\n  fichier  : ${chemin}\n` +
        "Ce n'est plus le fichier mesuré. Si la mise à jour est voulue : mesurer la lecture, puis corriger l'empreinte ici.",
    );
  }
  return octets;
}

/** Les versions déclarées et installées sont-elles exactement VERSIONS ? */
function verifierVersions() {
  const declare = JSON.parse(readFileSync(join(racine, 'package.json'), 'utf8'));
  const deps = { ...declare.devDependencies, ...declare.dependencies };
  const require = createRequire(join(racine, 'package.json'));
  for (const [paquet, version] of Object.entries(VERSIONS)) {
    if (deps[paquet] !== version) {
      throw new ErreurCopie(`package.json doit déclarer "${paquet}": "${version}" (version exacte), trouvé : ${deps[paquet] ?? 'absent'}.`);
    }
    let installee;
    try {
      installee = require(`${paquet}/package.json`).version;
    } catch {
      throw new ErreurCopie(`${paquet} n'est pas installé. Lancer « npm ci » dans app/.`);
    }
    if (installee !== version) {
      throw new ErreurCopie(`${paquet} installé en ${installee}, attendu ${version}. Lancer « npm ci » dans app/.`);
    }
  }
}

/**
 * Compression déterministe (niveau 9, pas de date dans l'en-tête gzip de
 * Node) puis vérification par aller-retour : ce qui sera servi se décompresse
 * bien en l'octet près du modèle vérifié.
 */
function compresser(octets, sha256) {
  const gz = gzipSync(octets, { level: zlib.Z_BEST_COMPRESSION });
  if (empreinte(gunzipSync(gz)) !== sha256) throw new ErreurCopie('mrz.traineddata.gz : la décompression ne redonne pas le modèle.');
  return gz;
}

/** Texte d'une licence sans ses lignes vides de tête ni de fin ; l'indentation du titre reste. */
const texte = (octets) => octets.toString('utf8').replace(/^(?:[ \t]*\r?\n)+/, '').trimEnd();

function texteLicences() {
  const apache = texte(lireVerifie(LICENCES.apache, 'LICENSE.md de tesseract.js'));
  const avis = texte(lireVerifie(LICENCES.avisWorker, 'avis tiers de worker.min.js'));
  const bsd = texte(lireVerifie(LICENCES.bsdMrz, 'licence du modèle mrz'));
  const trait = '='.repeat(78);
  return [
    `Fichiers servis sous /ocr/${DOSSIER_OCR}/ — licences`,
    trait,
    '',
    "Ces fichiers servent à lire, dans le navigateur, le nom et les prénoms",
    "inscrits sur une pièce photographiée. Aucun n'est modifié ; seul le modèle",
    '« mrz » est recompressé en gzip.',
    '',
    `worker.min.js ............................ tesseract.js ${VERSIONS['tesseract.js']}, Apache-2.0`,
    '    https://github.com/naptha/tesseract.js — avis des modules inclus plus bas.',
    `tesseract-core-*-lstm.wasm.js ............ tesseract.js-core ${VERSIONS['tesseract.js-core']}, Apache-2.0`,
    '    https://github.com/naptha/tesseract.js-core — compilation en WebAssembly de',
    '    Tesseract OCR (Apache-2.0) et de ses dépendances, chacune sous sa licence :',
    '    Leptonica (licence Leptonica, type BSD-2-Clause), libjpeg (licence IJG),',
    '    giflib (MIT), libpng (licence libpng), libtiff (licence libtiff),',
    '    libwebp (BSD-3-Clause), zlib (licence zlib), openlibm (MIT, BSD, ISC).',
    `fra.traineddata.gz ....................... modèle fra 4.0.0_best_int, paquet npm`,
    `    @tesseract.js-data/fra ${VERSIONS['@tesseract.js-data/fra']} (déclaré MIT) ; données tessdata du projet`,
    '    Tesseract OCR, Apache-2.0 — https://github.com/tesseract-ocr/tessdata',
    'mrz.traineddata.gz ....................... modèle mrz (tessdata_fast) de',
    '    DoubangoTelecom/tesseractMRZ, BSD-3-Clause (texte complet plus bas)',
    '    https://github.com/DoubangoTelecom/tesseractMRZ',
    '',
    trait,
    'Apache License 2.0 (tesseract.js, tesseract.js-core, Tesseract OCR, tessdata)',
    trait,
    '',
    apache,
    '',
    trait,
    'Avis des modules inclus dans worker.min.js',
    trait,
    '',
    avis,
    '',
    trait,
    'BSD 3-Clause — modèle mrz (DoubangoTelecom/tesseractMRZ)',
    trait,
    '',
    bsd,
    '',
  ].join('\n');
}

/** Écrit si le contenu diffère ; rend vrai si le fichier a été (ré)écrit. */
function ecrireSiDifferent(chemin, octets) {
  if (existsSync(chemin) && empreinte(readFileSync(chemin)) === empreinte(octets)) return false;
  writeFileSync(chemin, octets);
  return true;
}

export function copierOcr() {
  verifierVersions();

  const parent = join(racine, 'public', 'ocr');
  const cible = join(parent, DOSSIER_OCR);
  mkdirSync(cible, { recursive: true });

  const lignes = [];
  for (const fichier of FICHIERS) {
    const source = lireVerifie(fichier, fichier.nom);
    const octets = fichier.gzip ? compresser(source, fichier.sha256) : source;
    if (octets.length > TAILLE_MAX) throw new ErreurCopie(`${fichier.nom} dépasse 25 Mio : Cloudflare refuserait le déploiement.`);
    const ecrit = ecrireSiDifferent(join(cible, fichier.nom), octets);
    lignes.push(`  ${ecrit ? 'copié ' : 'inchangé'} ${fichier.nom} (${(octets.length / 1024).toFixed(0)} Kio)`);
  }
  const licences = ecrireSiDifferent(join(cible, 'LICENCES.txt'), Buffer.from(texteLicences(), 'utf8'));
  lignes.push(`  ${licences ? 'copié ' : 'inchangé'} LICENCES.txt`);

  // Un fichier de trop dans le dossier (reste d'un essai, ancien nom) partirait
  // en production sans avoir été vérifié : on ne garde que la liste attendue.
  const attendus = new Set([...FICHIERS.map((f) => f.nom), 'LICENCES.txt']);
  for (const nom of readdirSync(cible)) {
    if (!attendus.has(nom)) {
      rmSync(join(cible, nom), { recursive: true, force: true });
      lignes.push(`  retiré  ${nom} (non attendu)`);
    }
  }
  // Dossiers d'une autre version du moteur : jamais deux moteurs en ligne.
  for (const nom of readdirSync(parent)) {
    if (nom !== DOSSIER_OCR && /^tesseract-/.test(nom) && statSync(join(parent, nom)).isDirectory()) {
      rmSync(join(parent, nom), { recursive: true, force: true });
      lignes.push(`  retiré  ${nom}/ (ancienne version)`);
    }
  }
  return lignes;
}

// Exécuté seulement quand on lance le fichier ; importé (vite.config.ts), il
// n'expose que ses constantes et ne touche à rien.
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const lignes = copierOcr();
    console.log(`Moteur de lecture : public/ocr/${DOSSIER_OCR}/ (empreintes vérifiées)`);
    for (const l of lignes) console.log(l);
  } catch (err) {
    console.error(err instanceof ErreurCopie ? `copier-ocr : ${err.message}` : err);
    process.exit(1);
  }
}
