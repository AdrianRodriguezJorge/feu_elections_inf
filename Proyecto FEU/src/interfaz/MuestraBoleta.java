package interfaz;

import java.awt.BorderLayout;
import java.awt.FlowLayout;

import javax.swing.JButton;
import javax.swing.JDialog;
import javax.swing.JPanel;
import javax.swing.border.EmptyBorder;
import javax.swing.border.MatteBorder;
import javax.swing.JLabel;
import javax.swing.JCheckBox;
import javax.swing.SwingConstants;

import java.awt.Font;
import java.awt.Color;
import java.util.ArrayList;

import logica.Boleta;
import logica.Candidato;
import logica.Linea_Boleta;
import logica.ComisionElectoral;
import java.awt.event.ActionListener;
import java.awt.event.ActionEvent;
import java.awt.Toolkit;

public class MuestraBoleta extends JDialog {

	private ComisionElectoral CE;
	private Boleta boleta;
	private JCheckBox checkBox;
	private JCheckBox checkBox_1;
	private JCheckBox checkBox_2;
	private JCheckBox checkBox_3;
	private JCheckBox checkBox_4;
	private JCheckBox checkBox_5;
	private JCheckBox checkBox_6;
	private JCheckBox checkBox_7;
	private JCheckBox checkBox_8;
	private JCheckBox checkBox_9;
	private JCheckBox checkBox_10;
	private JCheckBox checkBox_11;
	private JCheckBox checkBox_12;
	private JCheckBox checkBox_13;
	private JCheckBox checkBox_14;
	private JCheckBox checkBox_15;
	private JCheckBox checkBox_16;
	private JCheckBox checkBox_17;
	private JCheckBox checkBox_18;
	private JCheckBox checkBox_19;
	private JLabel labelCod;
	private JLabel label_13;
	private JCheckBox checkBox_20;
	private JCheckBox checkBox_21;
	private JLabel lblNombre;
	
	public MuestraBoleta(ComisionElectoral CE1,Boleta boleta1) {
		getContentPane().setBackground(new Color(143, 182, 155));
		setResizable(false);
		setTitle("Boleta");
		
		this.CE = CE1;
		this.boleta = boleta1;
		setBounds(100, 100, 564, 523);
		getContentPane().setLayout(null);
		
		Candidato candidato;
		
		JLabel label = new JLabel("Boleta");
		label.setHorizontalAlignment(SwingConstants.CENTER);
		label.setForeground(new Color(35,  83,  71));
		label.setFont(new Font("SansSerif", Font.BOLD, 21));
		label.setBounds(206, 1, 139, 50);
		getContentPane().add(label);
		
		JLabel label_1 = new JLabel("<dynamic> <dynamic>");
		label_1.setFont(new Font("SansSerif", Font.PLAIN, 18));
		label_1.setHorizontalAlignment(SwingConstants.LEFT);
		label_1.setBounds(10, 85, 335, 25);
		candidato = CE.getCandidatosActivos().get(0);
		label_1.setText(candidato.getNombre()+" "+candidato.getApellidos());
		getContentPane().add(label_1);
		
		
		JLabel label_2 = new JLabel("<dynamic> <dynamic>");
		label_2.setFont(new Font("SansSerif", Font.PLAIN, 18));
		label_2.setHorizontalAlignment(SwingConstants.LEFT);
		label_2.setBounds(10, 117, 335, 25);
		candidato = CE.getCandidatosActivos().get(1);
		label_2.setText(candidato.getNombre()+" "+candidato.getApellidos());
		getContentPane().add(label_2);
		
		JLabel label_3 = new JLabel("<dynamic> <dynamic>");
		label_3.setFont(new Font("SansSerif", Font.PLAIN, 18));
		label_3.setHorizontalAlignment(SwingConstants.LEFT);
		label_3.setBounds(10, 148, 335, 25);
		candidato = CE.getCandidatosActivos().get(2);
		label_3.setText(candidato.getNombre()+" "+candidato.getApellidos());
		getContentPane().add(label_3);
		
		JLabel label_4 = new JLabel("<dynamic> <dynamic>");
		label_4.setFont(new Font("SansSerif", Font.PLAIN, 18));
		label_4.setHorizontalAlignment(SwingConstants.LEFT);
		label_4.setBounds(10, 178, 335, 25);
		candidato = CE.getCandidatosActivos().get(3);
		label_4.setText(candidato.getNombre()+" "+candidato.getApellidos());
		getContentPane().add(label_4);
		
		JLabel label_5 = new JLabel("<dynamic> <dynamic>");
		label_5.setFont(new Font("SansSerif", Font.PLAIN, 18));
		label_5.setHorizontalAlignment(SwingConstants.LEFT);
		label_5.setBounds(10, 208, 335, 25);
		candidato = CE.getCandidatosActivos().get(4);
		label_5.setText(candidato.getNombre()+" "+candidato.getApellidos());
		getContentPane().add(label_5);
		
		JLabel label_6 = new JLabel("<dynamic> <dynamic>");
		label_6.setFont(new Font("SansSerif", Font.PLAIN, 18));
		label_6.setHorizontalAlignment(SwingConstants.LEFT);
		label_6.setBounds(10, 239, 335, 25);
		candidato = CE.getCandidatosActivos().get(5);
		label_6.setText(candidato.getNombre()+" "+candidato.getApellidos());
		getContentPane().add(label_6);
		
		JLabel label_7 = new JLabel("<dynamic> <dynamic>");
		label_7.setFont(new Font("SansSerif", Font.PLAIN, 18));
		label_7.setHorizontalAlignment(SwingConstants.LEFT);
		label_7.setBounds(10, 272, 335, 25);
		candidato = CE.getCandidatosActivos().get(6);
		label_7.setText(candidato.getNombre()+" "+candidato.getApellidos());
		getContentPane().add(label_7);
		
		JLabel label_8 = new JLabel("<dynamic> <dynamic>");
		label_8.setFont(new Font("SansSerif", Font.PLAIN, 18));
		label_8.setHorizontalAlignment(SwingConstants.LEFT);
		label_8.setBounds(10, 303, 335, 25);
		candidato = CE.getCandidatosActivos().get(7);
		label_8.setText(candidato.getNombre()+" "+candidato.getApellidos());
		getContentPane().add(label_8);
		
		JLabel label_9 = new JLabel("<dynamic> <dynamic>");
		label_9.setFont(new Font("SansSerif", Font.PLAIN, 18));
		label_9.setHorizontalAlignment(SwingConstants.LEFT);
		label_9.setBounds(10, 334, 335, 25);
		candidato = CE.getCandidatosActivos().get(8);
		label_9.setText(candidato.getNombre()+" "+candidato.getApellidos());
		getContentPane().add(label_9);
		
		JLabel label_10 = new JLabel("<dynamic> <dynamic>");
		label_10.setFont(new Font("SansSerif", Font.PLAIN, 18));
		label_10.setHorizontalAlignment(SwingConstants.LEFT);
		label_10.setBounds(10, 364, 335, 25);
		candidato = CE.getCandidatosActivos().get(9);
		label_10.setText(candidato.getNombre()+" "+candidato.getApellidos());
		getContentPane().add(label_10);
		
		JLabel label_11 = new JLabel("Miembro");
		label_11.setHorizontalAlignment(SwingConstants.CENTER);
		label_11.setFont(new Font("SansSerif", Font.BOLD, 18));
		label_11.setBounds(318, 46, 103, 25);
		getContentPane().add(label_11);
		
		JLabel label_12 = new JLabel("Presidente");
		label_12.setHorizontalAlignment(SwingConstants.CENTER);
		label_12.setFont(new Font("SansSerif", Font.BOLD, 18));
		label_12.setBounds(424, 46, 103, 25);
		getContentPane().add(label_12);
		
		checkBox = new JCheckBox("");
		checkBox.setBackground(new Color(143, 182, 155));
		checkBox.setHorizontalAlignment(SwingConstants.CENTER);
		checkBox.setBounds(343, 82, 54, 25);
		checkBox.setEnabled(false);
		getContentPane().add(checkBox);
		
		checkBox_1 = new JCheckBox("");
		checkBox_1.setBackground(new Color(143, 182, 155));
		checkBox_1.setHorizontalAlignment(SwingConstants.CENTER);
		checkBox_1.setBounds(343, 114, 54, 25);
		checkBox_1.setEnabled(false);
		getContentPane().add(checkBox_1);
		
		checkBox_2 = new JCheckBox("");
		checkBox_2.setBackground(new Color(143, 182, 155));
		checkBox_2.setHorizontalAlignment(SwingConstants.CENTER);
		checkBox_2.setBounds(343, 145, 54, 25);
		checkBox_2.setEnabled(false);
		getContentPane().add(checkBox_2);
		
		checkBox_3 = new JCheckBox("");
		checkBox_3.setBackground(new Color(143, 182, 155));
		checkBox_3.setHorizontalAlignment(SwingConstants.CENTER);
		checkBox_3.setBounds(343, 175, 54, 25);
		checkBox_3.setEnabled(false);
		getContentPane().add(checkBox_3);
		
		checkBox_4 = new JCheckBox("");
		checkBox_4.setBackground(new Color(143, 182, 155));
		checkBox_4.setHorizontalAlignment(SwingConstants.CENTER);
		checkBox_4.setBounds(343, 205, 54, 25);
		checkBox_4.setEnabled(false);
		getContentPane().add(checkBox_4);
		
		checkBox_5 = new JCheckBox("");
		checkBox_5.setBackground(new Color(143, 182, 155));
		checkBox_5.setHorizontalAlignment(SwingConstants.CENTER);
		checkBox_5.setBounds(343, 236, 54, 25);
		checkBox_5.setEnabled(false);
		getContentPane().add(checkBox_5);
		
		checkBox_6 = new JCheckBox("");
		checkBox_6.setBackground(new Color(143, 182, 155));
		checkBox_6.setHorizontalAlignment(SwingConstants.CENTER);
		checkBox_6.setBounds(343, 269, 54, 25);
		checkBox_6.setEnabled(false);
		getContentPane().add(checkBox_6);
		
		checkBox_7 = new JCheckBox("");
		checkBox_7.setBackground(new Color(143, 182, 155));
		checkBox_7.setHorizontalAlignment(SwingConstants.CENTER);
		checkBox_7.setBounds(343, 300, 54, 25);
		checkBox_7.setEnabled(false);
		getContentPane().add(checkBox_7);
		
		checkBox_8 = new JCheckBox("");
		checkBox_8.setBackground(new Color(143, 182, 155));
		checkBox_8.setHorizontalAlignment(SwingConstants.CENTER);
		checkBox_8.setBounds(343, 331, 54, 25);
		checkBox_8.setEnabled(false);
		getContentPane().add(checkBox_8);
		
		checkBox_9 = new JCheckBox("");
		checkBox_9.setBackground(new Color(143, 182, 155));
		checkBox_9.setHorizontalAlignment(SwingConstants.CENTER);
		checkBox_9.setBounds(343, 361, 54, 25);
		checkBox_9.setEnabled(false);
		getContentPane().add(checkBox_9);
		
		checkBox_10 = new JCheckBox("");
		checkBox_10.setBackground(new Color(143, 182, 155));
		checkBox_10.setHorizontalAlignment(SwingConstants.CENTER);
		checkBox_10.setBounds(449, 82, 54, 25);
		checkBox_10.setEnabled(false);
		getContentPane().add(checkBox_10);
		
		checkBox_11 = new JCheckBox("");
		checkBox_11.setBackground(new Color(143, 182, 155));
		checkBox_11.setHorizontalAlignment(SwingConstants.CENTER);
		checkBox_11.setBounds(449, 114, 54, 25);
		checkBox_11.setEnabled(false);
		getContentPane().add(checkBox_11);
		
		checkBox_12 = new JCheckBox("");
		checkBox_12.setBackground(new Color(143, 182, 155));
		checkBox_12.setHorizontalAlignment(SwingConstants.CENTER);
		checkBox_12.setBounds(449, 145, 54, 25);
		checkBox_12.setEnabled(false);
		getContentPane().add(checkBox_12);
		
		checkBox_13 = new JCheckBox("");
		checkBox_13.setBackground(new Color(143, 182, 155));
		checkBox_13.setHorizontalAlignment(SwingConstants.CENTER);
		checkBox_13.setBounds(449, 175, 54, 25);
		checkBox_13.setEnabled(false);
		getContentPane().add(checkBox_13);
		
		checkBox_14 = new JCheckBox("");
		checkBox_14.setBackground(new Color(143, 182, 155));
		checkBox_14.setHorizontalAlignment(SwingConstants.CENTER);
		checkBox_14.setBounds(449, 205, 54, 25);
		checkBox_14.setEnabled(false);
		getContentPane().add(checkBox_14);
		
		checkBox_15 = new JCheckBox("");
		checkBox_15.setBackground(new Color(143, 182, 155));
		checkBox_15.setHorizontalAlignment(SwingConstants.CENTER);
		checkBox_15.setBounds(449, 236, 54, 25);
		checkBox_15.setEnabled(false);
		getContentPane().add(checkBox_15);
		
		checkBox_16 = new JCheckBox("");
		checkBox_16.setBackground(new Color(143, 182, 155));
		checkBox_16.setHorizontalAlignment(SwingConstants.CENTER);
		checkBox_16.setBounds(449, 269, 54, 25);
		checkBox_16.setEnabled(false);
		getContentPane().add(checkBox_16);
		
		checkBox_17 = new JCheckBox("");
		checkBox_17.setBackground(new Color(143, 182, 155));
		checkBox_17.setHorizontalAlignment(SwingConstants.CENTER);
		checkBox_17.setBounds(449, 300, 54, 25);
		checkBox_17.setEnabled(false);
		getContentPane().add(checkBox_17);
		
		checkBox_18 = new JCheckBox("");
		checkBox_18.setBackground(new Color(143, 182, 155));
		checkBox_18.setHorizontalAlignment(SwingConstants.CENTER);
		checkBox_18.setBounds(449, 331, 54, 25);
		checkBox_18.setEnabled(false);
		getContentPane().add(checkBox_18);
		
		checkBox_19 = new JCheckBox("");
		checkBox_19.setBackground(new Color(143, 182, 155));
		checkBox_19.setHorizontalAlignment(SwingConstants.CENTER);
		checkBox_19.setBounds(449, 361, 54, 25);
		checkBox_19.setEnabled(false);
		getContentPane().add(checkBox_19);
		
		labelCod = new JLabel("0");
		labelCod.setFont(new Font("SansSerif", Font.BOLD, 18));
		labelCod.setBounds(52, 20, 46, 14);
		labelCod.setText(Integer.toString(boleta.getCodigo()));
		getContentPane().add(labelCod);
		
		JLabel label_14 = new JLabel("CB: ");
		label_14.setFont(new Font("SansSerif", Font.BOLD, 18));
		label_14.setBounds(15, 19, 39, 14);
		getContentPane().add(label_14);
		
		label_13 = new JLabel("<dynamic> <dynamic>");
		label_13.setFont(new Font("SansSerif", Font.PLAIN, 18));
		label_13.setHorizontalAlignment(SwingConstants.LEFT);
		label_13.setBounds(10, 389, 335, 25);
		candidato = CE.getCandidatosActivos().get(10);
		label_13.setText(candidato.getNombre()+" "+candidato.getApellidos());
		getContentPane().add(label_13);
		
		checkBox_20 = new JCheckBox("");
		checkBox_20.setBackground(new Color(143, 182, 155));
		checkBox_20.setHorizontalAlignment(SwingConstants.CENTER);
		checkBox_20.setEnabled(false);
		checkBox_20.setBounds(343, 387, 54, 25);
		getContentPane().add(checkBox_20);
		
		checkBox_21 = new JCheckBox("");
		checkBox_21.setBackground(new Color(143, 182, 155));
		checkBox_21.setHorizontalAlignment(SwingConstants.CENTER);
		checkBox_21.setEnabled(false);
		checkBox_21.setBounds(449, 389, 54, 25);
		getContentPane().add(checkBox_21);
		
		lblNombre = new JLabel("Nombre");
		lblNombre.setHorizontalAlignment(SwingConstants.CENTER);
		lblNombre.setFont(new Font("SansSerif", Font.BOLD, 18));
		lblNombre.setBounds(103, 44, 103, 25);
		getContentPane().add(lblNombre);
		{
			JButton okButton = new JButton("OK");
			okButton.setBackground(Color.WHITE);
			okButton.setBounds(436, 434, 67, 33);
			getContentPane().add(okButton);
			okButton.setFont(new Font("SansSerif", Font.PLAIN, 17));
			okButton.addActionListener(new ActionListener() {
				public void actionPerformed(ActionEvent e) {
					dispose();
				}
			});
			okButton.setActionCommand("OK");
			getRootPane().setDefaultButton(okButton);
		}
		
		marcarVotos();
	}
	
	public void marcarVotos(){
		ArrayList<Linea_Boleta> lista =  boleta.getLineas();
		//Primera linea
		if(lista.get(0).esMiembro())
			checkBox.setSelected(true);
		if(lista.get(0).esPresidente())
			checkBox_10.setSelected(true);
		//Segunda linea
		if(lista.get(1).esMiembro())
			checkBox_1.setSelected(true);
		if(lista.get(1).esPresidente())
			checkBox_11.setSelected(true);
		//Tercera linea
		if(lista.get(2).esMiembro())
			checkBox_2.setSelected(true);
		if(lista.get(2).esPresidente())
			checkBox_12.setSelected(true);
		//Cuarta linea
		if(lista.get(3).esMiembro())
			checkBox_3.setSelected(true);
		if(lista.get(3).esPresidente())
			checkBox_13.setSelected(true);
		//Quinta linea
		if(lista.get(4).esMiembro())
			checkBox_4.setSelected(true);
		if(lista.get(4).esPresidente())
			checkBox_14.setSelected(true);
		//Sexta linea
		if(lista.get(5).esMiembro())
			checkBox_5.setSelected(true);
		if(lista.get(5).esPresidente())
			checkBox_15.setSelected(true);
		//Septima linea
		if(lista.get(6).esMiembro())
			checkBox_6.setSelected(true);
		if(lista.get(6).esPresidente())
			checkBox_16.setSelected(true);
		//Octava linea
		if(lista.get(7).esMiembro())
			checkBox_7.setSelected(true);
		if(lista.get(7).esPresidente())
			checkBox_17.setSelected(true);
		//Noveno linea
		if(lista.get(8).esMiembro())
			checkBox_8.setSelected(true);
		if(lista.get(8).esPresidente())
			checkBox_18.setSelected(true);
		//Decima linea
		if(lista.get(9).esMiembro())
			checkBox_9.setSelected(true);
		if(lista.get(9).esPresidente())
			checkBox_19.setSelected(true);
		//Undecima linea
		if(lista.get(10).esMiembro())
			checkBox_20.setSelected(true);
		if(lista.get(10).esPresidente())
			checkBox_21.setSelected(true);
	}
}
