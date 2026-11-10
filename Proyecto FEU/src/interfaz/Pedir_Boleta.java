package interfaz;

import java.awt.BorderLayout;
import java.awt.FlowLayout;

import javax.swing.JButton;
import javax.swing.JDialog;
import javax.swing.JPanel;
import javax.swing.border.EmptyBorder;
import javax.swing.JTextField;
import javax.swing.JLabel;

import java.awt.event.ActionListener;
import java.awt.event.ActionEvent;

import logica.Boleta;
import logica.ComisionElectoral;
import java.awt.Color;
import java.awt.Font;

public class Pedir_Boleta extends JDialog {

	private final JPanel contentPanel = new JPanel();
	private JTextField textField;
	private ComisionElectoral CE;
	private JLabel Error;

	public Pedir_Boleta(ComisionElectoral CE1) {
		setResizable(false);
		setFont(new Font("SansSerif", Font.PLAIN, 18));
		setTitle("Revisión");
		this.CE = CE1;
		setBounds(100, 100, 331, 193);
		getContentPane().setLayout(new BorderLayout());
		contentPanel.setBackground(new Color(143, 182, 155));
		contentPanel.setBorder(new EmptyBorder(5, 5, 5, 5));
		getContentPane().add(contentPanel, BorderLayout.CENTER);
		contentPanel.setLayout(null);
		
		textField = new JTextField();
		textField.setFont(new Font("SansSerif", Font.PLAIN, 18));
		textField.setBounds(107, 45, 86, 24);
		contentPanel.add(textField);
		textField.setColumns(10);
		
		JLabel lblIngreseSuCdigo = new JLabel("Ingrese el código de su boleta");
		lblIngreseSuCdigo.setFont(new Font("SansSerif", Font.PLAIN, 18));
		lblIngreseSuCdigo.setBounds(29, 11, 256, 24);
		contentPanel.add(lblIngreseSuCdigo);
		{
			Error = new JLabel("New label");
			Error.setFont(new Font("SansSerif", Font.PLAIN, 18));
			Error.setForeground(new Color(20,57,49));
			Error.setBounds(61, 72, 194, 22);
			Error.setVisible(false);
			contentPanel.add(Error);
		}
		{
			JPanel buttonPane = new JPanel();
			buttonPane.setBackground(new Color(143, 182, 155));
			buttonPane.setLayout(new FlowLayout(FlowLayout.RIGHT));
			getContentPane().add(buttonPane, BorderLayout.SOUTH);
			{
				JButton okButton = new JButton("OK");
				okButton.setBackground(Color.WHITE);
				okButton.setFont(new Font("SansSerif", Font.PLAIN, 16));
				okButton.addActionListener(new ActionListener() {
					public void actionPerformed(ActionEvent e) {
						String codigo = textField.getText();
						boolean isDigit = true;
						int cod;
						if(codigo.replaceAll(" ","").isEmpty()){
							Error.setText("Entrada vacía");
							Error.setVisible(true);
						}
						else{
							for(int i=0; i<codigo.length() && isDigit;i++)
								if(!Character.isDigit(codigo.charAt(i)))
									isDigit = false;
							if(isDigit){
								cod = Integer.parseInt(codigo);
								Boleta boleta = CE.buscarBoleta(cod);
								if(boleta != null){
									MuestraBoleta ms = new MuestraBoleta(CE,boleta);
									dispose();
									ms.setModal(true);
									ms.setVisible(true);			
								}
								else{
									Error.setText("Boleta no encontrada");
									Error.setVisible(true);
								}
							}
							else{
								Error.setText("Código no válido");
								Error.setVisible(true);
							}
						}
					}
				});
				okButton.setActionCommand("OK");
				buttonPane.add(okButton);
				getRootPane().setDefaultButton(okButton);
			}
			{
				JButton cancelButton = new JButton("Cancel");
				cancelButton.setBackground(Color.WHITE);
				cancelButton.setFont(new Font("SansSerif", Font.PLAIN, 16));
				cancelButton.setActionCommand("Cancel");
				buttonPane.add(cancelButton);
			}
		}
	}
}
