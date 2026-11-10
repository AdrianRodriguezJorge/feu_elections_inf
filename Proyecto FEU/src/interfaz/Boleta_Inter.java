package interfaz;

import java.awt.BorderLayout;
import java.awt.EventQueue;
import java.awt.event.*;

import javax.swing.JFrame;
import javax.swing.JPanel;
import javax.swing.border.EmptyBorder;
import javax.swing.border.MatteBorder;
import javax.swing.JButton;
import javax.swing.JLabel;
import javax.swing.JOptionPane;
import javax.swing.SwingConstants;
import javax.swing.JCheckBox;
import javax.swing.JDialog;

import java.awt.event.ActionListener;
import java.awt.event.ActionEvent;
import java.awt.Font;
import java.awt.Color;
import java.util.Random;

import logica.Boleta;
import logica.Candidato;
import logica.Linea_Boleta;
import logica.ComisionElectoral;
import logica.Votante;
import java.awt.Toolkit;
import javax.swing.UIManager;

public class Boleta_Inter extends JDialog {

	private JPanel contentPane;
	private JCheckBox checkBox_M1;
	private JCheckBox checkBox_P1;
	private JLabel label_01;
	private JCheckBox checkBox_P5;
	
	private boolean votoPresi = false;
	private boolean segundaVez = false;
	private ComisionElectoral comision;
	private Votante votante;
	private JLabel label_error;
	private JCheckBox checkBox_M2;
	private JCheckBox checkBox_M3;
	private JCheckBox checkBox_M4;
	private JCheckBox checkBox_M5;
	private JCheckBox checkBox_M6;
	private JCheckBox checkBox_M7;
	private JCheckBox checkBox_M8;
	private JCheckBox checkBox_M9;
	private JCheckBox checkBox_M10;
	private JCheckBox checkBox_P2;
	private JCheckBox checkBox_P3;
	private JCheckBox checkBox_P4;
	private JCheckBox checkBox_P6;
	private JCheckBox checkBox_P7;
	private JCheckBox checkBox_P8;
	private JCheckBox checkBox_P9;
	private JCheckBox checkBox_P10;
	private JLabel label;
	private JLabel label_1;
	private JLabel label_2;
	private JLabel label_3;
	private JLabel label_4;
	private JLabel label_5;
	private JLabel label_6;
	private JPanel panel;
	private JLabel label_7;
	private JLabel label_8;
	private JLabel label_CB;
	private JLabel lblCodigo;
	private JButton button_9;
	private JLabel label_9;
	private JCheckBox checkBox_M11;
	private JCheckBox checkBox_P11;
	private JLabel lblFacultad;
	private JLabel label_10;
	private JLabel label_11;
	private JLabel label_12;
	private JLabel label_13;
	private JLabel label_14;
	private JLabel label_15;
	private JLabel label_16;
	private JLabel label_17;
	private JLabel label_18;
	private JLabel label_19;
	private JLabel label_20;
	private JLabel lblNombre;

	
	
	public Boleta_Inter(ComisionElectoral comision1, Votante votante1) {
		setFont(new Font("SansSerif", Font.PLAIN, 18));
		setResizable(false);
		setIconImage(Toolkit.getDefaultToolkit().getImage(Boleta_Inter.class.getResource("/imagenes/logo_cujae.jpg")));
		this.comision = comision1;
		this.votante = votante1;
		setForeground(new Color(0, 153, 102));
		setBackground(new Color(0, 153, 102));
		setTitle("Boleta");
		setBounds(100, 100, 944, 577);
		contentPane = new JPanel();
		contentPane.setBorder(new MatteBorder(5, 5, 5, 5, (Color) new Color(35,  83,  71)));
		contentPane.setLayout(new BorderLayout(0, 0));
		setContentPane(contentPane);

		setLocationRelativeTo(null);
		
		panel = new JPanel();
		panel.setForeground(new Color(51, 153, 51));
		panel.setBackground(new Color(143, 182, 155));
		contentPane.add(panel, BorderLayout.CENTER);
		panel.setLayout(null);
		
		JButton btnNewButton = new JButton("Biografía");
		btnNewButton.setFont(new Font("SansSerif", Font.PLAIN, 18));
		btnNewButton.setBackground(new Color(143, 182, 155));
		btnNewButton.addActionListener(new ActionListener() {
			public void actionPerformed(ActionEvent e) {
				String descripcion = comision.getCandidatosActivos().get(0).getDescripcion();
				String des ="<html><p style = 'width: 200px;'>" + descripcion + "</p></html>";
				String nombre = comision.getCandidatosActivos().get(0).getNombre()+" "+
						comision.getCandidatosActivos().get(0).getApellidos();
				JOptionPane.showMessageDialog(null,des,nombre,JOptionPane.INFORMATION_MESSAGE);
			}
		});
		btnNewButton.setBounds(15, 80, 116, 25);
		panel.add(btnNewButton);
		
		JButton button = new JButton("Biografía");
		button.setFont(new Font("SansSerif", Font.PLAIN, 18));
		button.setBackground(new Color(143, 182, 155));
		button.addActionListener(new ActionListener() {
			public void actionPerformed(ActionEvent e) {
				String descripcion = comision.getCandidatosActivos().get(1).getDescripcion();
				String des ="<html><p style = 'width: 200px;'>" + descripcion + "</p></html>";
				String nombre = comision.getCandidatosActivos().get(1).getNombre()+" "+
						comision.getCandidatosActivos().get(1).getApellidos();
				JOptionPane.showMessageDialog(null,des,nombre,JOptionPane.INFORMATION_MESSAGE);	
			}
		});
		button.setBounds(15, 112, 116, 25);
		panel.add(button);
		
		JButton button_1 = new JButton("Biografía");
		button_1.setFont(new Font("SansSerif", Font.PLAIN, 18));
		button_1.setBackground(new Color(143, 182, 155));
		button_1.addActionListener(new ActionListener() {
			public void actionPerformed(ActionEvent e) {
				String descripcion = comision.getCandidatosActivos().get(2).getDescripcion();
				String des ="<html><p style = 'width: 200px;'>" + descripcion + "</p></html>";
				String nombre = comision.getCandidatosActivos().get(2).getNombre()+" "+
						comision.getCandidatosActivos().get(2).getApellidos();
				JOptionPane.showMessageDialog(null,des,nombre,JOptionPane.INFORMATION_MESSAGE);
			}
		});
		button_1.setBounds(15, 143, 116, 25);
		panel.add(button_1);
		
		JButton button_2 = new JButton("Biografía");
		button_2.setFont(new Font("SansSerif", Font.PLAIN, 18));
		button_2.setBackground(new Color(143, 182, 155));
		button_2.addActionListener(new ActionListener() {
			public void actionPerformed(ActionEvent e) {
				String descripcion = comision.getCandidatosActivos().get(3).getDescripcion();
				String des ="<html><p style = 'width: 200px;'>" + descripcion + "</p></html>";
				String nombre = comision.getCandidatosActivos().get(3).getNombre()+" "+
						comision.getCandidatosActivos().get(3).getApellidos();
				JOptionPane.showMessageDialog(null,des,nombre,JOptionPane.INFORMATION_MESSAGE);
			}
		});
		button_2.setBounds(15, 173, 116, 25);
		panel.add(button_2);
		
		JButton button_3 = new JButton("Biografía");
		button_3.setFont(new Font("SansSerif", Font.PLAIN, 18));
		button_3.setBackground(new Color(143, 182, 155));
		button_3.addActionListener(new ActionListener() {
			public void actionPerformed(ActionEvent e) {
				String descripcion = comision.getCandidatosActivos().get(4).getDescripcion();
				String des ="<html><p style = 'width: 200px;'>" + descripcion + "</p></html>";
				String nombre = comision.getCandidatosActivos().get(4).getNombre()+" "+
						comision.getCandidatosActivos().get(4).getApellidos();
				JOptionPane.showMessageDialog(null,des,nombre,JOptionPane.INFORMATION_MESSAGE);
			}
		});
		button_3.setBounds(15, 203, 116, 25);
		panel.add(button_3);
		
		JButton button_4 = new JButton("Biografía");
		button_4.setFont(new Font("SansSerif", Font.PLAIN, 18));
		button_4.setBackground(new Color(143, 182, 155));
		button_4.addActionListener(new ActionListener() {
			public void actionPerformed(ActionEvent e) {
				String descripcion = comision.getCandidatosActivos().get(5).getDescripcion();
				String des ="<html><p style = 'width: 200px;'>" + descripcion + "</p></html>";
				String nombre = comision.getCandidatosActivos().get(5).getNombre()+" "+
						comision.getCandidatosActivos().get(5).getApellidos();
				JOptionPane.showMessageDialog(null,des,nombre,JOptionPane.INFORMATION_MESSAGE);
			}
		});
		button_4.setBounds(15, 234, 116, 25);
		panel.add(button_4);
		
		JButton button_5 = new JButton("Biografía");
		button_5.setFont(new Font("SansSerif", Font.PLAIN, 18));
		button_5.setBackground(new Color(143, 182, 155));
		button_5.setBackground(new Color(143, 182, 155));
		button_5.addActionListener(new ActionListener() {
			public void actionPerformed(ActionEvent e) {
				String descripcion = comision.getCandidatosActivos().get(6).getDescripcion();
				String des ="<html><p style = 'width: 200px;'>" + descripcion + "</p></html>";
				String nombre = comision.getCandidatosActivos().get(6).getNombre()+" "+
						comision.getCandidatosActivos().get(6).getApellidos();
				JOptionPane.showMessageDialog(null,des,nombre,JOptionPane.INFORMATION_MESSAGE);
			}
		});
		button_5.setBounds(15, 267, 116, 25);
		panel.add(button_5);
		
		JButton button_6 = new JButton("Biografía");
		button_6.setFont(new Font("SansSerif", Font.PLAIN, 18));
		button_6.setBackground(new Color(143, 182, 155));
		button_6.addActionListener(new ActionListener() {
			public void actionPerformed(ActionEvent e) {
				String descripcion = comision.getCandidatosActivos().get(7).getDescripcion();
				String des ="<html><p style = 'width: 200px;'>" + descripcion + "</p></html>";
				String nombre = comision.getCandidatosActivos().get(7).getNombre()+" "+
						comision.getCandidatosActivos().get(7).getApellidos();
				JOptionPane.showMessageDialog(null,des,nombre,JOptionPane.INFORMATION_MESSAGE);
			}
		});
		button_6.setBounds(15, 298, 116, 25);
		panel.add(button_6);
		
		JButton button_7 = new JButton("Biografía");
		button_7.setFont(new Font("SansSerif", Font.PLAIN, 18));
		button_7.setBackground(new Color(143, 182, 155));
		button_7.addActionListener(new ActionListener() {
			public void actionPerformed(ActionEvent e) {
				String descripcion = comision.getCandidatosActivos().get(8).getDescripcion();
				String des ="<html><p style = 'width: 200px;'>" + descripcion + "</p></html>";
				String nombre = comision.getCandidatosActivos().get(8).getNombre()+" "+
						comision.getCandidatosActivos().get(8).getApellidos();
				JOptionPane.showMessageDialog(null,des,nombre,JOptionPane.INFORMATION_MESSAGE);
			}
		});
		button_7.setBounds(15, 329, 116, 25);
		panel.add(button_7);
		
		JButton button_8 = new JButton("Biografía");
		button_8.setFont(new Font("SansSerif", Font.PLAIN, 18));
		button_8.setBackground(new Color(143, 182, 155));
		button_8.addActionListener(new ActionListener() {
			public void actionPerformed(ActionEvent e) {
				String descripcion = comision.getCandidatosActivos().get(9).getDescripcion();
				String des ="<html><p style = 'width: 200px;'>" + descripcion + "</p></html>";
				String nombre = comision.getCandidatosActivos().get(9).getNombre()+" "+
						comision.getCandidatosActivos().get(9).getApellidos();
				JOptionPane.showMessageDialog(null,des,nombre,JOptionPane.INFORMATION_MESSAGE);
			}
		});
		button_8.setBounds(15, 359, 116, 25);
		panel.add(button_8);
		
		Candidato candidato;
		
		label = new JLabel("Nombre y Apellidos");
		label.setFont(new Font("SansSerif", Font.PLAIN, 18));
		label.setHorizontalAlignment(SwingConstants.LEFT);
		label.setBounds(146, 112, 343, 25);
		panel.add(label);
		candidato = comision.getCandidatosActivos().get(1);
		label.setText(candidato.getNombre()+" "+candidato.getApellidos());
		
		label_2 = new JLabel("Nombre y Apellidos");
		label_2.setFont(new Font("SansSerif", Font.PLAIN, 18));
		label_2.setHorizontalAlignment(SwingConstants.LEFT);
		label_2.setBounds(146, 173, 343, 25);
		panel.add(label_2);
		candidato = comision.getCandidatosActivos().get(3);
		label_2.setText(candidato.getNombre()+" "+candidato.getApellidos());
		
		label_3 = new JLabel("Nombre y Apellidos");
		label_3.setFont(new Font("SansSerif", Font.PLAIN, 18));
		label_3.setHorizontalAlignment(SwingConstants.LEFT);
		label_3.setBounds(146, 203, 343, 25);
		panel.add(label_3);
		candidato = comision.getCandidatosActivos().get(4);
		label_3.setText(candidato.getNombre()+" "+candidato.getApellidos());
		
		label_4 = new JLabel("Nombre y Apellidos");
		label_4.setFont(new Font("SansSerif", Font.PLAIN, 18));
		label_4.setHorizontalAlignment(SwingConstants.LEFT);
		label_4.setBounds(146, 234, 343, 25);
		panel.add(label_4);
		candidato = comision.getCandidatosActivos().get(5);
		label_4.setText(candidato.getNombre()+" "+candidato.getApellidos());
		
		label_5 = new JLabel("Nombre y Apellidos");
		label_5.setFont(new Font("SansSerif", Font.PLAIN, 18));
		label_5.setHorizontalAlignment(SwingConstants.LEFT);
		label_5.setBounds(146, 267, 343, 25);
		panel.add(label_5);
		candidato = comision.getCandidatosActivos().get(6);
		label_5.setText(candidato.getNombre()+" "+candidato.getApellidos());
		
		label_6 = new JLabel("Nombre y Apellidos");
		label_6.setFont(new Font("SansSerif", Font.PLAIN, 18));
		label_6.setHorizontalAlignment(SwingConstants.LEFT);
		label_6.setBounds(146, 298, 343, 25);
		panel.add(label_6);
		candidato = comision.getCandidatosActivos().get(7);
		label_6.setText(candidato.getNombre()+" "+candidato.getApellidos());
		
		label_7 = new JLabel("Nombre y Apellidos");
		label_7.setFont(new Font("SansSerif", Font.PLAIN, 18));
		label_7.setHorizontalAlignment(SwingConstants.LEFT);
		label_7.setBounds(146, 329, 343, 25);
		panel.add(label_7);
		candidato = comision.getCandidatosActivos().get(8);
		label_7.setText(candidato.getNombre()+" "+candidato.getApellidos());
		
		label_8 = new JLabel("Nombre y Apellidos");
		label_8.setFont(new Font("SansSerif", Font.PLAIN, 18));
		label_8.setHorizontalAlignment(SwingConstants.LEFT);
		label_8.setBounds(146, 359, 343, 25);
		panel.add(label_8);
		candidato = comision.getCandidatosActivos().get(9);
		label_8.setText(candidato.getNombre()+" "+candidato.getApellidos());
		
		label_1 = new JLabel("Nombre y Apellidos");
		label_1.setFont(new Font("SansSerif", Font.PLAIN, 18));
		label_1.setHorizontalAlignment(SwingConstants.LEFT);
		label_1.setBounds(146, 143, 343, 25);
		panel.add(label_1);
		candidato = comision.getCandidatosActivos().get(2);
		label_1.setText(candidato.getNombre()+" "+candidato.getApellidos());
		
		label_01 = new JLabel("Nombre y Apellidos");
		label_01.setFont(new Font("SansSerif", Font.PLAIN, 18));
		label_01.setHorizontalAlignment(SwingConstants.LEFT);
		label_01.setBounds(146, 80, 343, 25);
		panel.add(label_01);
		candidato = comision.getCandidatosActivos().get(0);
		label_01.setText(candidato.getNombre()+" "+candidato.getApellidos());
		
		checkBox_M1 = new JCheckBox("");
		checkBox_M1.setFont(new Font("SansSerif", Font.PLAIN, 18));
		checkBox_M1.setBackground(new Color(143, 182, 155));
		checkBox_M1.setBackground(new Color(143, 182, 155));
		checkBox_M1.setHorizontalAlignment(SwingConstants.CENTER);
		checkBox_M1.setBounds(723, 79, 54, 25);
		panel.add(checkBox_M1);
		
		checkBox_M2 = new JCheckBox("");
		checkBox_M2.setFont(new Font("SansSerif", Font.PLAIN, 18));
		checkBox_M2.setBackground(new Color(143, 182, 155));
		checkBox_M2.setHorizontalAlignment(SwingConstants.CENTER);
		checkBox_M2.setBounds(723, 111, 54, 25);
		panel.add(checkBox_M2);
		
		checkBox_M3 = new JCheckBox("");
		checkBox_M3.setFont(new Font("SansSerif", Font.PLAIN, 18));
		checkBox_M3.setBackground(new Color(143, 182, 155));
		checkBox_M3.setHorizontalAlignment(SwingConstants.CENTER);
		checkBox_M3.setBounds(723, 142, 54, 25);
		panel.add(checkBox_M3);
		
		checkBox_M4 = new JCheckBox("");
		checkBox_M4.setFont(new Font("SansSerif", Font.PLAIN, 18));
		checkBox_M4.setBackground(new Color(143, 182, 155));
		checkBox_M4.setHorizontalAlignment(SwingConstants.CENTER);
		checkBox_M4.setBounds(723, 172, 54, 25);
		panel.add(checkBox_M4);
		
		checkBox_M5 = new JCheckBox("");
		checkBox_M5.setFont(new Font("SansSerif", Font.PLAIN, 18));
		checkBox_M5.setBackground(new Color(143, 182, 155));
		checkBox_M5.setHorizontalAlignment(SwingConstants.CENTER);
		checkBox_M5.setBounds(723, 202, 54, 25);
		panel.add(checkBox_M5);
		
		checkBox_M6 = new JCheckBox("");
		checkBox_M6.setFont(new Font("SansSerif", Font.PLAIN, 18));
		checkBox_M6.setBackground(new Color(143, 182, 155));
		checkBox_M6.setHorizontalAlignment(SwingConstants.CENTER);
		checkBox_M6.setBounds(723, 233, 54, 25);
		panel.add(checkBox_M6);
		
		checkBox_M7 = new JCheckBox("");
		checkBox_M7.setFont(new Font("SansSerif", Font.PLAIN, 18));
		checkBox_M7.setBackground(new Color(143, 182, 155));
		checkBox_M7.setHorizontalAlignment(SwingConstants.CENTER);
		checkBox_M7.setBounds(723, 266, 54, 25);
		panel.add(checkBox_M7);
		
		checkBox_M8 = new JCheckBox("");
		checkBox_M8.setFont(new Font("SansSerif", Font.PLAIN, 18));
		checkBox_M8.setBackground(new Color(143, 182, 155));
		checkBox_M8.setHorizontalAlignment(SwingConstants.CENTER);
		checkBox_M8.setBounds(723, 297, 54, 25);
		panel.add(checkBox_M8);
		
		checkBox_M9 = new JCheckBox("");
		checkBox_M9.setFont(new Font("SansSerif", Font.PLAIN, 18));
		checkBox_M9.setBackground(new Color(143, 182, 155));
		checkBox_M9.setHorizontalAlignment(SwingConstants.CENTER);
		checkBox_M9.setBounds(723, 328, 54, 25);
		panel.add(checkBox_M9);
		
		checkBox_M10 = new JCheckBox("");
		checkBox_M10.setFont(new Font("SansSerif", Font.PLAIN, 18));
		checkBox_M10.setBackground(new Color(143, 182, 155));
		checkBox_M10.setHorizontalAlignment(SwingConstants.CENTER);
		checkBox_M10.setBounds(723, 358, 54, 25);
		panel.add(checkBox_M10);
		
		checkBox_P1 = new JCheckBox("");
		checkBox_P1.setFont(new Font("SansSerif", Font.PLAIN, 18));
		checkBox_P1.setBackground(new Color(143, 182, 155));
		checkBox_P1.setHorizontalAlignment(SwingConstants.CENTER);
		checkBox_P1.setBounds(828, 79, 54, 25);
		panel.add(checkBox_P1);
		
		checkBox_P2 = new JCheckBox("");
		checkBox_P2.setFont(new Font("SansSerif", Font.PLAIN, 18));
		checkBox_P2.setBackground(new Color(143, 182, 155));
		checkBox_P2.setHorizontalAlignment(SwingConstants.CENTER);
		checkBox_P2.setBounds(828, 111, 54, 25);
		panel.add(checkBox_P2);
		
		checkBox_P3 = new JCheckBox("");
		checkBox_P3.setFont(new Font("SansSerif", Font.PLAIN, 18));
		checkBox_P3.setBackground(new Color(143, 182, 155));
		checkBox_P3.setHorizontalAlignment(SwingConstants.CENTER);
		checkBox_P3.setBounds(828, 142, 54, 25);
		panel.add(checkBox_P3);
		
		checkBox_P4 = new JCheckBox("");
		checkBox_P4.setFont(new Font("SansSerif", Font.PLAIN, 18));
		checkBox_P4.setBackground(new Color(143, 182, 155));
		checkBox_P4.setHorizontalAlignment(SwingConstants.CENTER);
		checkBox_P4.setBounds(828, 172, 54, 25);
		panel.add(checkBox_P4);
		
		checkBox_P5 = new JCheckBox("");
		checkBox_P5.setFont(new Font("SansSerif", Font.PLAIN, 18));
		checkBox_P5.setBackground(new Color(143, 182, 155));
		checkBox_P5.setHorizontalAlignment(SwingConstants.CENTER);
		checkBox_P5.setBounds(828, 202, 54, 25);
		panel.add(checkBox_P5);
		
		checkBox_P6 = new JCheckBox("");
		checkBox_P6.setFont(new Font("SansSerif", Font.PLAIN, 18));
		checkBox_P6.setBackground(new Color(143, 182, 155));
		checkBox_P6.setHorizontalAlignment(SwingConstants.CENTER);
		checkBox_P6.setBounds(828, 233, 54, 25);
		panel.add(checkBox_P6);
		
		checkBox_P7 = new JCheckBox("");
		checkBox_P7.setFont(new Font("SansSerif", Font.PLAIN, 18));
		checkBox_P7.setBackground(new Color(143, 182, 155));
		checkBox_P7.setHorizontalAlignment(SwingConstants.CENTER);
		checkBox_P7.setBounds(828, 266, 54, 25);
		panel.add(checkBox_P7);
		
		checkBox_P8 = new JCheckBox("");
		checkBox_P8.setFont(new Font("SansSerif", Font.PLAIN, 18));
		checkBox_P8.setBackground(new Color(143, 182, 155));
		checkBox_P8.setHorizontalAlignment(SwingConstants.CENTER);
		checkBox_P8.setBounds(828, 297, 54, 25);
		panel.add(checkBox_P8);
		
		checkBox_P9 = new JCheckBox("");
		checkBox_P9.setFont(new Font("SansSerif", Font.PLAIN, 18));
		checkBox_P9.setBackground(new Color(143, 182, 155));
		checkBox_P9.setHorizontalAlignment(SwingConstants.CENTER);
		checkBox_P9.setBounds(828, 328, 54, 25);
		panel.add(checkBox_P9);
		
		checkBox_P10 = new JCheckBox("");
		checkBox_P10.setFont(new Font("SansSerif", Font.PLAIN, 18));
		checkBox_P10.setBackground(new Color(143, 182, 155));
		checkBox_P10.setHorizontalAlignment(SwingConstants.CENTER);
		checkBox_P10.setBounds(828, 358, 54, 25);
		panel.add(checkBox_P10);
		
		JButton btnNewButton_1 = new JButton("Aceptar");
		btnNewButton_1.setBackground(Color.WHITE);
		btnNewButton_1.addActionListener(new ActionListener() {
			public void actionPerformed(ActionEvent e) {
				boolean valida;
					Boleta boleta = armarBoleta();
					valida = verificarValida(boleta);		
					if(!valida && !segundaVez){
						label_error.setVisible(true);
						segundaVez = true;
					}
					else{
						boleta.setValidez(valida);
						comision.getBoletas().add(boleta);
						JOptionPane.showMessageDialog(null, "Boleta registrada con éxito"
								+ "\nSu código de boleta es: " + boleta.getCodigo());
						votante.setYaVoto(true);
						dispose();
					}
			}
		});
		btnNewButton_1.setFont(new Font("SansSerif", Font.PLAIN, 18));
		btnNewButton_1.setBounds(771, 454, 111, 40);
		panel.add(btnNewButton_1);
		
		JLabel lblBoleta = new JLabel("Boleta");
		lblBoleta.setForeground(new Color(35,  83,  71));
		lblBoleta.setFont(new Font("SansSerif", Font.BOLD, 24));
		lblBoleta.setHorizontalAlignment(SwingConstants.CENTER);
		lblBoleta.setBounds(370, 0, 139, 50);
		panel.add(lblBoleta);
		
		JLabel lblNewLabel_1 = new JLabel("Miembro");
		lblNewLabel_1.setFont(new Font("SansSerif", Font.BOLD, 18));
		lblNewLabel_1.setHorizontalAlignment(SwingConstants.CENTER);
		lblNewLabel_1.setBounds(693, 45, 103, 25);
		panel.add(lblNewLabel_1);
		
		JLabel lblPresidente = new JLabel("Presidente");
		lblPresidente.setFont(new Font("SansSerif", Font.BOLD, 18));
		lblPresidente.setHorizontalAlignment(SwingConstants.CENTER);
		lblPresidente.setBounds(802, 45, 103, 25);
		panel.add(lblPresidente);
		
		label_error = new JLabel("Por favor revise su boleta.");
		label_error.setForeground(new Color(0, 0, 139));
		label_error.setHorizontalAlignment(SwingConstants.CENTER);
		label_error.setFont(new Font("SansSerif", Font.PLAIN, 18));
		label_error.setBounds(493, 459, 224, 30);
		panel.add(label_error);
		label_error.setVisible(false);
		
		JButton btnNewButton_2 = new JButton("?");
		btnNewButton_2.setBackground(Color.WHITE);
		btnNewButton_2.setForeground(new Color(35, 83, 71));
		btnNewButton_2.addActionListener(new ActionListener() {
			public void actionPerformed(ActionEvent e) 
			{
				JOptionPane.showMessageDialog(null, "<html><p style = 'width: 200px;'>" + "En los votos para miembros, se podrá marcar hasta 9 miembros que es la estructura actual del secretariado de la FEU de la universidad, mientras que en los de presidente, se deberá marcar por un solo candidato, el cual debe ser uno de los que se marcó como miembro." + "</p></html>", "Información",JOptionPane.INFORMATION_MESSAGE);
			}
		});
		btnNewButton_2.setFont(new Font("SansSerif", Font.BOLD, 20));
		btnNewButton_2.setBounds(35, 453, 76, 40);
		panel.add(btnNewButton_2);
		
		label_CB = new JLabel("CB: ");
		label_CB.setFont(new Font("SansSerif", Font.BOLD, 18));
		label_CB.setBounds(15, 12, 46, 30);
		panel.add(label_CB);
		
		int codigo = generarCod();
		lblCodigo = new JLabel(""+codigo);
		lblCodigo.setFont(new Font("SansSerif", Font.BOLD, 18));
		lblCodigo.setBounds(53, 21, 46, 14);
		panel.add(lblCodigo);
		
		button_9 = new JButton("Biografía");
		button_9.setFont(new Font("SansSerif", Font.PLAIN, 18));
		button_9.setBackground(new Color(143, 182, 155));
		button_9.addActionListener(new ActionListener() {
			public void actionPerformed(ActionEvent e) {
				String descripcion = comision.getCandidatosActivos().get(10).getDescripcion();
				String des ="<html><p style = 'width: 200px;'>" + descripcion + "</p></html>";
				String nombre = comision.getCandidatosActivos().get(10).getNombre()+" "+
						comision.getCandidatosActivos().get(10).getApellidos();
				JOptionPane.showMessageDialog(null,des,nombre,JOptionPane.INFORMATION_MESSAGE);
			}
		});
		button_9.setBounds(15, 391, 116, 25);
		panel.add(button_9);
		
		label_9 = new JLabel("<dynamic> <dynamic>");
		label_9.setFont(new Font("SansSerif", Font.PLAIN, 18));
		label_9.setHorizontalAlignment(SwingConstants.LEFT);
		label_9.setBounds(146, 391, 343, 25);
		panel.add(label_9);
		candidato = comision.getCandidatosActivos().get(10);
		label_9.setText(candidato.getNombre()+" "+candidato.getApellidos());
		
		checkBox_M11 = new JCheckBox("");
		checkBox_M11.setFont(new Font("SansSerif", Font.PLAIN, 18));
		checkBox_M11.setBackground(new Color(143, 182, 155));
		checkBox_M11.setHorizontalAlignment(SwingConstants.CENTER);
		checkBox_M11.setBounds(723, 390, 54, 25);
		panel.add(checkBox_M11);
		
		checkBox_P11 = new JCheckBox("");
		checkBox_P11.setFont(new Font("SansSerif", Font.PLAIN, 18));
		checkBox_P11.setBackground(new Color(143, 182, 155));
		checkBox_P11.setHorizontalAlignment(SwingConstants.CENTER);
		checkBox_P11.setBounds(828, 391, 54, 25);
		panel.add(checkBox_P11);
		
		lblFacultad = new JLabel("Facultad");
		lblFacultad.setHorizontalAlignment(SwingConstants.CENTER);
		lblFacultad.setFont(new Font("SansSerif", Font.BOLD, 18));
		lblFacultad.setBounds(545, 45, 103, 25);
		panel.add(lblFacultad);
		
		label_10 = new JLabel("<dynamic> <dynamic>");
		label_10.setFont(new Font("SansSerif", Font.PLAIN, 18));
		label_10.setHorizontalAlignment(SwingConstants.LEFT);
		label_10.setBounds(493, 80, 224, 25);
		candidato = comision.getCandidatosActivos().get(0);
		label_10.setText(candidato.getFacultad());
		panel.add(label_10);
		
		label_11 = new JLabel("<dynamic> <dynamic>");
		label_11.setFont(new Font("SansSerif", Font.PLAIN, 18));
		label_11.setHorizontalAlignment(SwingConstants.LEFT);
		label_11.setBounds(493, 112, 224, 25);
		candidato = comision.getCandidatosActivos().get(1);
		label_11.setText(candidato.getFacultad());
		panel.add(label_11);
		
		label_12 = new JLabel("<dynamic> <dynamic>");
		label_12.setFont(new Font("SansSerif", Font.PLAIN, 18));
		label_12.setHorizontalAlignment(SwingConstants.LEFT);
		label_12.setBounds(493, 143, 224, 25);
		candidato = comision.getCandidatosActivos().get(2);
		label_12.setText(candidato.getFacultad());
		panel.add(label_12);
		
		label_13 = new JLabel("<dynamic> <dynamic>");
		label_13.setFont(new Font("SansSerif", Font.PLAIN, 18));
		label_13.setHorizontalAlignment(SwingConstants.LEFT);
		label_13.setBounds(493, 173, 224, 25);
		candidato = comision.getCandidatosActivos().get(3);
		label_13.setText(candidato.getFacultad());
		panel.add(label_13);
		
		label_14 = new JLabel("<dynamic> <dynamic>");
		label_14.setFont(new Font("SansSerif", Font.PLAIN, 18));
		label_14.setHorizontalAlignment(SwingConstants.LEFT);
		label_14.setBounds(493, 203, 224, 25);
		candidato = comision.getCandidatosActivos().get(4);
		label_14.setText(candidato.getFacultad());
		panel.add(label_14);
		
		label_15 = new JLabel("<dynamic> <dynamic>");
		label_15.setFont(new Font("SansSerif", Font.PLAIN, 18));
		label_15.setHorizontalAlignment(SwingConstants.LEFT);
		label_15.setBounds(493, 234, 224, 25);
		candidato = comision.getCandidatosActivos().get(05);
		label_15.setText(candidato.getFacultad());
		panel.add(label_15);
		
		label_16 = new JLabel("<dynamic> <dynamic>");
		label_16.setFont(new Font("SansSerif", Font.PLAIN, 18));
		label_16.setHorizontalAlignment(SwingConstants.LEFT);
		label_16.setBounds(493, 267, 224, 25);
		candidato = comision.getCandidatosActivos().get(6);
		label_16.setText(candidato.getFacultad());
		panel.add(label_16);
		
		label_17 = new JLabel("<dynamic> <dynamic>");
		label_17.setFont(new Font("SansSerif", Font.PLAIN, 18));
		label_17.setHorizontalAlignment(SwingConstants.LEFT);
		label_17.setBounds(493, 298, 224, 25);
		candidato = comision.getCandidatosActivos().get(7);
		label_17.setText(candidato.getFacultad());
		panel.add(label_17);
		
		label_18 = new JLabel("<dynamic> <dynamic>");
		label_18.setFont(new Font("SansSerif", Font.PLAIN, 18));
		label_18.setHorizontalAlignment(SwingConstants.LEFT);
		label_18.setBounds(493, 329, 224, 25);
		candidato = comision.getCandidatosActivos().get(8);
		label_18.setText(candidato.getFacultad());
		panel.add(label_18);
		
		label_19 = new JLabel("<dynamic> <dynamic>");
		label_19.setFont(new Font("SansSerif", Font.PLAIN, 18));
		label_19.setHorizontalAlignment(SwingConstants.LEFT);
		label_19.setBounds(493, 359, 224, 25);
		candidato = comision.getCandidatosActivos().get(9);
		label_19.setText(candidato.getFacultad());
		panel.add(label_19);
		
		label_20 = new JLabel("<dynamic> <dynamic>");
		label_20.setFont(new Font("SansSerif", Font.PLAIN, 18));
		label_20.setHorizontalAlignment(SwingConstants.LEFT);
		label_20.setBounds(493, 391, 224, 25);
		candidato = comision.getCandidatosActivos().get(10);
		label_20.setText(candidato.getFacultad());
		panel.add(label_20);
		
		lblNombre = new JLabel("Nombres y apellidos");
		lblNombre.setHorizontalAlignment(SwingConstants.CENTER);
		lblNombre.setFont(new Font("SansSerif", Font.BOLD, 18));
		lblNombre.setBounds(181, 45, 204, 25);
		panel.add(lblNombre);
		
		
	}
	
	public Boleta armarBoleta(){
		
		int codigo = Integer.parseInt(lblCodigo.getText());
		Boleta boleta = new Boleta(codigo);
		Linea_Boleta linea;
		String nombre;
		boolean presidente;
		boolean miembro;
		
		//Primera linea
		nombre = label_01.getText();
		miembro = checkBox_M1.isSelected();
		presidente = checkBox_P1.isSelected();
		
		linea = new Linea_Boleta(nombre,miembro,presidente);
		boleta.getLineas().add(linea);
		
		//Segunda linea
		nombre = label.getText();
		miembro = checkBox_M2.isSelected();
		presidente = checkBox_P2.isSelected();
				
		linea = new Linea_Boleta(nombre,miembro,presidente);
		boleta.getLineas().add(linea);
		
		//Tercera linea
		nombre = label_1.getText();
		miembro = checkBox_M3.isSelected();
		presidente = checkBox_P3.isSelected();
				
		linea = new Linea_Boleta(nombre,miembro,presidente);
		boleta.getLineas().add(linea);
		
		//Cuarta linea
		nombre = label_2.getText();
		miembro = checkBox_M4.isSelected();
		presidente = checkBox_P4.isSelected();
				
		linea = new Linea_Boleta(nombre,miembro,presidente);
		boleta.getLineas().add(linea);
		
		//Quinta linea
		nombre = label_3.getText();
		miembro = checkBox_M5.isSelected();
		presidente = checkBox_P5.isSelected();
				
		linea = new Linea_Boleta(nombre,miembro,presidente);
		boleta.getLineas().add(linea);
		
		//Sexta linea
		nombre = label_4.getText();
		miembro = checkBox_M6.isSelected();
		presidente = checkBox_P6.isSelected();
				
		linea = new Linea_Boleta(nombre,miembro,presidente);
		boleta.getLineas().add(linea);
		
		//Septima linea
		nombre = label_5.getText();
		miembro = checkBox_M7.isSelected();
		presidente = checkBox_P7.isSelected();
				
		linea = new Linea_Boleta(nombre,miembro,presidente);
		boleta.getLineas().add(linea);
		
		//Octava linea
		nombre = label_6.getText();
		miembro = checkBox_M8.isSelected();
		presidente = checkBox_P8.isSelected();
				
		linea = new Linea_Boleta(nombre,miembro,presidente);
		boleta.getLineas().add(linea);
		
		//Novena linea
		nombre = label_7.getText();
		miembro = checkBox_M9.isSelected();
		presidente = checkBox_P9.isSelected();
				
		linea = new Linea_Boleta(nombre,miembro,presidente);
		boleta.getLineas().add(linea);
		
		//Decima liena
		nombre = label_8.getText();
		miembro = checkBox_M10.isSelected();
		presidente = checkBox_P10.isSelected();
				
		linea = new Linea_Boleta(nombre,miembro,presidente);
		boleta.getLineas().add(linea);
		
		//Oncena linea
		nombre = label_9.getText();
		miembro = checkBox_M11.isSelected();
		presidente = checkBox_P11.isSelected();
		
		linea = new Linea_Boleta(nombre,miembro,presidente);
		boleta.getLineas().add(linea);
		
		return boleta;
	}
	
	public boolean verificarValida(Boleta boleta){
		int cantC = 0, cantP = 0;
		boolean votoPresi = false;
		boolean vali = true;
		for(Linea_Boleta l: boleta.getLineas()){
			if(l.esMiembro() && l.esPresidente())
			{
				if(!votoPresi)
					votoPresi = true;
				else
					vali = false;
			}
			else if (l.esPresidente())
			{
				vali = false;
			}
			if(l.esMiembro())
				cantC++;
			if(l.esPresidente())
				cantP++;
		}
		return (cantC == 9 && cantP == 1 && vali) ? true : false;
	}
	
	public int generarCod(){
		Random random = new Random();
		int codigo;
		boolean repetido;
		do{
			codigo = random.nextInt(9999);
			repetido = yaEsta(codigo);
		}
		while(repetido);
		return codigo;
	}
	
	public boolean yaEsta(int codigo){
		boolean encont = false;
		int i = 0;
		int compCod;
		while( i < comision.getBoletas().size() && !encont){
			compCod = comision.getBoletas().get(i).getCodigo();
			if(codigo == compCod)
				encont = true;
			else
				i++;
		}
		return encont;
	}
}
