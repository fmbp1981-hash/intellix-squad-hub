# Prompt para salvar gatilho na memória do Claude Code

> Cole este prompt no Claude Code UMA VEZ.
> Ele vai salvar o gatilho na memória persistente do projeto.

---

## PROMPT — copie tudo abaixo e cole no Claude Code

```
Quero que você salve na sua memória persistente deste projeto uma regra
de gatilho. Toda vez que eu abrir o Claude Code neste repositório, você
deve verificar se o gatilho foi ativado e me avisar.

REGRA DE GATILHO — MELHORIAS_FUTURAS:

Nome: "Implementar Melhorias Futuras da Base de Conhecimento"
Arquivo: docs/analise/MELHORIAS_FUTURAS.md

Monitore estes 3 sinais durante qualquer conversa ou sessão neste repo:

  SINAL 1 — Fase A concluída
  Detectado quando: Felipe mencionar que a ingestion da Base de
  Conhecimento está funcionando OU quando existir a edge function
  knowledge-ingest deployada e testada com sucesso.

  SINAL 2 — Agentes em uso real
  Detectado quando: Felipe mencionar que Bia ou Carlos já atenderam
  leads reais OU quando existirem registros em squad_runs com data
  de uso posterior à conclusão da Fase A.

  SINAL 3 — Gatilho verbal de Felipe
  Detectado quando: Felipe disser qualquer variação de:
    - "minha equipe tem resistência a IA"
    - "o lead falou que vai esperar"
    - "o cliente conhece o Método IDEAL"
    - "hora de implementar as melhorias"
    - "melhorias futuras"

AÇÃO quando os 3 sinais forem verdadeiros:
  1. Avisar Felipe: "Felipe, os 3 sinais do gatilho de Melhorias Futuras
     foram atingidos. Posso implementar agora?"
  2. Aguardar confirmação de Felipe
  3. Se confirmado: ler docs/analise/MELHORIAS_FUTURAS.md e executar
     as instruções da seção "Como implementar"

AÇÃO quando apenas SINAL 3 for verdadeiro (sem os outros 2):
  Avisar: "Esse é um gatilho de Melhorias Futuras, mas a Fase A ainda
  precisa estar concluída. Anoto para quando estiver pronto."

Confirme que salvou respondendo exatamente:
"Gatilho salvo. Vou monitorar os 3 sinais e avisar quando for hora de
implementar docs/analise/MELHORIAS_FUTURAS.md."
```
