# Checklist de Testes Manuais — ShareScreen DEV

Execute em `https://127.0.0.1:3443` após `start-dev.bat`.

- [ ] 1. Host abre em DEV
- [ ] 2. Client abre em DEV
- [ ] 3. Client compartilha tela
- [ ] 4. Client compartilha microfone
- [ ] 5. Client compartilha áudio do sistema (Chrome/Edge)
- [ ] 6. Host vê client na lista
- [ ] 7. Host seleciona client
- [ ] 8. Host vê preview
- [ ] 9. Outro client recebe transmissão
- [ ] 10. Áudio e vídeo permanecem sincronizados
- [ ] 11. Host pausa
- [ ] 12. Host retoma
- [ ] 13. Host limpa transmissão
- [ ] 14. Client recompartilha
- [ ] 15. Queda de WebSocket simula reconexão (desligar/ligar rede)
- [ ] 16. Fechamento de aba limpa peer
- [ ] 17. Gravação inicia
- [ ] 18. Gravação para
- [ ] 19. Gravação salva em `_dev_recordings/` ou erro claro
- [ ] 20. Layout OK em 1366×768
- [ ] 21. Layout OK em 1920×1080
- [ ] 22. Tela cheia funciona
- [ ] 23. Copiar link funciona
- [ ] 24. Erros de permissão são didáticos
- [ ] 25. HTTP inseguro mostra aviso
- [ ] 26. HTTPS funciona
- [ ] 27. Nenhum script de produção executado
- [ ] 28. Caminho `\\cgrafsysvm\...` não alterado
- [ ] 29. Modo espectador funciona sem captura
- [ ] 30. Painel diagnóstico exibe métricas (bitrate, perda, RTT, FPS)
- [ ] 31. Erros recentes visíveis no painel Diagnóstico (detalhe recolhível)
- [ ] 32. Reconnect host mostra botão "Compartilhar tela novamente" sem popup automático
- [ ] 33. VU meter reage ao microfone no onboarding (ao compartilhar)

> Após auditoria QA 16/06/2026 — ver [RELATORIO-QA-FINAL-DEV.md](RELATORIO-QA-FINAL-DEV.md)
