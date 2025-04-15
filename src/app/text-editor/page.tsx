import TextEditorExample from '../../components/UI/TextEditorExample';
import styles from './page.module.css';

export const metadata = {
  title: 'Text Editor | Enderfall',
  description: 'Text Editor component example',
};

export default function TextEditorPage() {
  return (
    <div className={styles.container}>
      <div className={styles['content-wrapper']}>
        <h1>Text Editor Component</h1>
        <p>Below is an example of our text editor component implemented using the modal component.</p>
        <TextEditorExample />
      </div>
    </div>
  );
} 