<!--
  MODELO / RASCUNHO — REVISÃO JURÍDICA OBRIGATÓRIA ANTES DE PUBLICAR.
  Este documento foi redigido por engenharia como ponto de partida técnico, alinhado
  ao funcionamento real do sistema. NÃO é aconselhamento jurídico. Um(a) advogado(a)
  deve revisar, ajustar às decisões comerciais e validar antes de qualquer uso com
  dados de pessoas reais.

  Preencha todos os campos {{ENTRE_CHAVES}} com os dados reais da empresa.
-->

# Política de Privacidade

**Última atualização:** {{DATA_VIGENCIA}}

Esta Política explica como a **{{RAZAO_SOCIAL}}**, CNPJ {{CNPJ}} ("**{{NOME_COMERCIAL}}**",
"plataforma", "nós"), trata dados pessoais no serviço de agendamento online disponível em
{{DOMINIO}}, em conformidade com a **Lei nº 13.709/2018 (LGPD)**.

Leia junto com os [Termos de Uso](./termos-de-uso.md).

---

## 1. Quem é o Controlador e quem é o Operador (leia primeiro)

O ponto mais importante desta Política. Há **dois tipos de pessoa** cujos dados transitam
pela plataforma, e o nosso papel legal é **diferente** em cada caso:

| Situação | Titular dos dados | Controlador | Operador |
|---|---|---|---|
| **Conta do negócio** (dono, equipe) | O profissional/dono que assina a plataforma | **{{NOME_COMERCIAL}}** | — |
| **Cliente final** (quem marca horário num negócio) | O cliente do negócio | **O negócio** (o estabelecimento que usa a plataforma) | **{{NOME_COMERCIAL}}** |

Em outras palavras: quando um cliente marca um horário na barbearia "X" através da nossa
plataforma, **quem decide sobre aqueles dados é a barbearia "X"** (é o Controlador). Nós
apenas **processamos** esses dados **em nome dela** e conforme suas instruções (somos o
Operador). A base de clientes é isolada por negócio — um negócio não acessa os clientes de
outro.

Consequências práticas para você, **cliente final**: se quiser exercer direitos sobre seus
dados (acesso, correção, exclusão), o responsável primário é **o estabelecimento onde você
agendou**. Ainda assim, podemos ajudar a intermediar o pedido — veja a seção 9.

Consequências para você, **dono/negócio**: ao carregar dados dos seus clientes na
plataforma, **você é o Controlador** e assume as obrigações de Controlador da LGPD (ter base
legal, informar seus clientes, atender direitos). Isso está detalhado nos [Termos de Uso](./termos-de-uso.md).

---

## 2. Quais dados tratamos

**Da conta do negócio (somos Controladores):**
- Identificação e contato: nome, e-mail, telefone.
- Dados de acesso: e-mail e senha (armazenada com hash, nunca em texto puro).
- Dados de cobrança da assinatura: identificadores de pagamento gerados pelo gateway
  (não armazenamos o número completo do cartão).
- Dados de recebimento (quando o negócio ativa pagamento online): CPF/CNPJ e chave PIX,
  para repasse dos valores. O número do documento é exibido mascarado na interface.
- Dados de uso: logs de acesso, ações no painel, endereço IP, para segurança e operação.

**Do cliente final (somos Operadores, a mando do negócio):**
- Identificação e contato: nome, telefone e, quando informado, e-mail.
- Histórico de agendamentos: serviços, profissionais, datas, valores.
- Quando o negócio usa cupom/fidelidade: dados de participação nesses programas, o que pode
  revelar **padrão de compra/frequência**.
- Quando há pagamento no agendamento: identificadores da transação gerados pelo gateway.

Não coletamos intencionalmente dados pessoais **sensíveis** (art. 5º, II da LGPD). Peça aos
negócios que **não** insiram dados de saúde ou outros sensíveis em campos livres.

---

## 3. Para que usamos (finalidades) e com qual base legal

| Finalidade | Base legal (LGPD art. 7º/art. 11) |
|---|---|
| Criar e operar a conta do negócio; prestar o serviço contratado | Execução de contrato (art. 7º, V) |
| Agendar horários e gerenciar a agenda do cliente final | Execução de contrato / a mando do Controlador (o negócio) |
| Enviar confirmações e lembretes (e-mail) do agendamento | Execução de contrato / legítimo interesse do negócio em reduzir faltas |
| Enviar código de verificação por e-mail (acesso do cliente à área "meus agendamentos") | Execução de contrato / segurança do acesso |
| Processar pagamentos (assinatura e agendamento) | Execução de contrato; cumprimento de obrigação legal (fiscal) |
| Segurança, prevenção a fraude e abuso (rate limit, logs) | Legítimo interesse (art. 7º, IX) |
| Cumprir obrigações legais/fiscais e responder autoridades | Obrigação legal (art. 7º, II) |
| Campanhas de marketing do negócio a seus clientes | Definida pelo **negócio** (Controlador) — normalmente consentimento ou legítimo interesse |

Onde a base for **consentimento**, ele pode ser revogado a qualquer momento, sem afetar a
licitude do tratamento anterior.

---

## 4. Com quem compartilhamos (operadores e suboperadores)

Não vendemos dados pessoais. Compartilhamos com prestadores estritamente necessários para
operar o serviço, que tratam os dados como Operadores/suboperadores sob contrato:

| Prestador | Finalidade | Dados envolvidos |
|---|---|---|
| **Mercado Pago** | Processamento de pagamentos (assinatura, agendamento) | Dados de transação, e-mail, documento |
| **{{PROVEDOR_EMAIL}}** (ex.: Resend) | Envio de e-mails transacionais e código de verificação | Nome, e-mail |
| **{{PROVEDOR_HOSPEDAGEM}}** | Hospedagem e infraestrutura | Todos os dados, em repouso e trânsito |

Também podemos compartilhar por **obrigação legal** ou ordem de autoridade competente.

## 5. Transferência internacional

Alguns prestadores acima podem tratar dados **fora do Brasil**. Nesses casos, adotamos as
salvaguardas exigidas pela LGPD (art. 33), como cláusulas contratuais adequadas.
{{AJUSTAR_CONFORME_PROVEDORES}}

## 6. Por quanto tempo guardamos

- Dados da conta do negócio: enquanto a conta existir e pelo prazo legal após o encerramento
  (obrigações fiscais/contábeis, em regra até 5 anos).
- Dados de cliente final: enquanto o negócio mantiver a relação e a conta ativa; podem ser
  eliminados a pedido do negócio (Controlador) ou do titular, respeitados prazos legais.
- Logs de acesso: pelo prazo legal aplicável (Marco Civil da Internet, art. 15 — em regra 6 meses).

Após os prazos, os dados são eliminados ou anonimizados.

## 7. Como protegemos

Medidas técnicas e organizacionais compatíveis com o risco: senhas com hash, transporte
criptografado (HTTPS), isolamento de dados por negócio (multi-tenant), controle de acesso por
papel, limitação de tentativas (rate limit) e backups. Nenhum sistema é 100% seguro; em caso
de incidente relevante, seguimos a seção 10.

## 8. Cookies e tecnologias similares

Usamos cookies/armazenamento local **estritamente necessários** para autenticação e
funcionamento (ex.: manter a sessão do painel). {{DESCREVER_ANALYTICS_SE_HOUVER}}. Você pode
bloquear cookies no navegador, mas partes do serviço podem deixar de funcionar.

## 9. Seus direitos (LGPD art. 18)

Você pode solicitar: confirmação de tratamento, acesso, correção, anonimização/bloqueio/
eliminação, portabilidade, informação sobre compartilhamentos, e revogação de consentimento.

- **Cliente final:** o responsável primário é **o negócio onde você agendou**. Contate-o
  diretamente; se precisar, podemos intermediar pelo canal abaixo.
- **Conta do negócio:** fale conosco diretamente.

**Canal do titular / Encarregado (DPO):** {{NOME_DPO}} — {{EMAIL_DPO}}.
Respondemos no prazo legal. Podemos pedir informações para confirmar sua identidade.

## 10. Incidentes de segurança

Em caso de incidente que possa acarretar risco ou dano relevante, comunicaremos a ANPD e os
titulares afetados nos termos do art. 48 da LGPD, no prazo razoável.

## 11. Alterações desta Política

Podemos atualizar esta Política. Mudanças relevantes serão comunicadas por e-mail ou aviso na
plataforma. A data no topo indica a última revisão.

## 12. Contato

{{RAZAO_SOCIAL}} — CNPJ {{CNPJ}}
{{ENDERECO}}
Encarregado (DPO): {{NOME_DPO}} — {{EMAIL_DPO}}
Contato geral: {{EMAIL_CONTATO}}
