/**
 * Évalue ce que la capture contient réellement.
 *
 * Une extension qui lit le DOM récupère ce qui est affiché. Sur un article
 * payant, cela peut être le texte intégral (session authentifiée) ou seulement
 * le chapeau. Le desk doit le savoir avant qu'un agent n'écrive à partir du
 * texte : une affirmation non couverte par la source est le pire défaut du
 * système.
 */

const CTA_PATTERNS = [
  [/subscribe to (?:continue|read|keep reading)/i, 'appel à l’abonnement'],
  [/already a subscriber/i, 'invitation à se connecter'],
  [/(?:sign|log) in to (?:continue|read)/i, 'invitation à se connecter'],
  [/to continue reading/i, 'invitation à continuer la lecture'],
  [/this article is (?:for|available to) subscribers/i, 'article réservé'],
  [/unlock (?:this|the) article/i, 'article verrouillé'],
  [/abonnez[- ]vous/i, 'appel à l’abonnement'],
  [/réservé(?:e)? aux abonnés/i, 'article réservé'],
  [/cet article est réservé/i, 'article réservé'],
  [/pour lire la suite/i, 'invitation à continuer la lecture'],
  [/la suite est réservée/i, 'article réservé'],
];

const TERMINALS = ['.', '!', '?', '…', '»', '”', '"'];

/**
 * Vrai si le texte s'arrête très loin du dernier signe de ponctuation forte.
 *
 * Le seuil est volontairement large : une queue courte (un encart
 * « FT Interview », une mention de copyright) ne doit pas déclencher d'alerte.
 * Les vrais signaux de paywall sont les appels à l'abonnement, traités plus bas.
 */
export function looksTruncated(text) {
  const clean = String(text ?? '').trim();
  if (!clean) return false;
  if (clean.length < 200) return true;
  const lastTerminal = Math.max(
    ...TERMINALS.map((char) => clean.lastIndexOf(char)),
  );
  if (lastTerminal === -1) return true;
  return clean.length - lastTerminal > 220;
}

export function assessCoverage(article) {
  const text = String(article.content_text ?? '').trim();
  const failed =
    article.capture_success === 0 || article.capture_success === false;

  if (failed) {
    return {
      level: 'failed',
      reasons: [article.capture_error || 'capture échouée'],
      word_count: 0,
    };
  }

  if (!text) {
    return { level: 'failed', reasons: ['texte vide'], word_count: 0 };
  }

  const words =
    Number(article.word_count) || text.split(/\s+/).filter(Boolean).length;
  const tail = text.slice(-900);
  const reasons = [];

  const cta = CTA_PATTERNS.find(([pattern]) => pattern.test(tail));
  if (cta) reasons.push(cta[1]);

  if (words < 150) reasons.push(`texte court (${words} mots)`);
  if (looksTruncated(text)) reasons.push('texte interrompu avant la fin');

  return {
    level: reasons.length ? 'partial' : 'full',
    reasons,
    word_count: words,
  };
}
