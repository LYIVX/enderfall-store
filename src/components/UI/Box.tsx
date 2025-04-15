import { ReactNode, CSSProperties } from 'react';
import styles from './Box.module.css';

interface BoxProps {
  children: ReactNode;
  title?: string;
  variant?: 'default' | 'outlined' | 'filled';
  className?: string;
  style?: CSSProperties;
}

const Box = ({
  children,
  title,
  variant = 'default',
  className = '',
  style,
}: BoxProps) => {
  const boxClasses = [
    styles.box,
    styles[variant],
    className,
  ].join(' ');

  return (
    <div className={boxClasses} style={style}>
      {title && <div className={styles.header}>{title}</div>}
      <div className={styles.content}>{children}</div>
    </div>
  );
};

export default Box; 