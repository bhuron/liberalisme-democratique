/**
 * Publish the desk brief as a DSH skill, so any agent can discover the rules
 * through the ordinary `skill` tool instead of needing the panel.
 */
export function registerSkill(ctx, service) {
  const skills = ctx.get?.('skills');
  if (!skills?.registerProvider) return () => {};

  return ctx.effect(
    () =>
      skills.registerProvider(() => ({
        name: 'bureau',
        async list() {
          return {
            complete: true,
            candidates: [
              {
                name: 'bureau',
                description:
                  'Le bureau éditorial de Libéralisme Démocratique : sources figées, rôles du pipeline, charte de style et outils desk_*.',
                whenToUse:
                  'Pour travailler une pièce du bureau (recherche, brief, brouillon, critique, révision, paquet) ou relire les règles éditoriales.',
                source: 'runtime',
                provider: 'bureau',
                invocation: { modelInvocable: true, userInvocable: true },
                rank: 0,
                locator: null,
              },
            ],
          };
        },
        async get(candidate) {
          return {
            ...candidate,
            content: await service.skillContent(),
          };
        },
      })),
    'bureau: skill provider',
  );
}
