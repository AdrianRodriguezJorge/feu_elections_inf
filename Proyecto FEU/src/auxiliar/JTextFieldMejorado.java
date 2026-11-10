package auxiliar;

import javax.swing.JTextField;
import java.awt.event.KeyAdapter;
import java.awt.event.KeyEvent;

public class JTextFieldMejorado extends JTextField{
	public JTextFieldMejorado() {
		addKeyListener(new KeyAdapter() {
			@Override
			public void keyTyped(KeyEvent e) {
				JTextField text = (JTextField)e.getSource();
				if(text.getText().length()== limite)
					e.consume();
			}
		});
	}
	
	private int limite = -1;
	public int getLimite() {
		return this.limite;
	}
	
	public void setLimite(int limite) {
		if(limite >= -1)
			this.limite = limite;
	}
}
