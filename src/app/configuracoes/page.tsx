import PageHeader from "@/components/PageHeader";
import styles from "./configuracoes.module.css";

export default function ConfiguracoesPage() {
  return (
    <div>
      <PageHeader title="Configurações" subtitle="Informações da conta" />
      <div className={styles.card}>
        <div className={styles.row}>
          <span className={styles.label}>Nome</span>
          <span>Sérgio Mattina</span>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>Moeda</span>
          <span>Real brasileiro (BRL)</span>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>Tipo de acesso</span>
          <span>Uso pessoal — sem múltiplos usuários</span>
        </div>
      </div>
    </div>
  );
}
