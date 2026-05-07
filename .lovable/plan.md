## Problema

Os sprites em pixel art não aparecem porque, em `src/components/office/OfficeAssets.ts`, depois de `rt.saveTexture(agent.key)` chamamos `rt.destroy()`. No Phaser, `RenderTexture` é dona da GL texture compartilhada via `saveTexture`; destruí-la invalida a textura usada pelos sprites — resultado: agentes ficam invisíveis (ou caixinhas vazias).

(Observação: a tela de login que aparece no preview é apenas porque a sessão expirou. O bug dos sprites é independente disso e ocorrerá após o login.)

## Correção

Em `src/components/office/OfficeAssets.ts`, dentro de `createAgentTexture`:

- Remover `rt.destroy();` após `saveTexture` e o loop de `tex.add(...)`.
- Manter `rt.setVisible(false)` (já feito) para não desenhar a folha de sprites na cena.

Apenas 1 linha alterada. Nenhum outro arquivo afetado.

Aprovar para aplicar?
