package interfaz;

import java.awt.BorderLayout;
import java.awt.FlowLayout;
import java.awt.Graphics;
import java.awt.Image;
import java.awt.Toolkit;

import javax.swing.JButton;
import javax.swing.JDialog;
import javax.swing.JPanel;
import javax.swing.border.EmptyBorder;
import javax.swing.JLabel;

import java.awt.Font;

import javax.swing.JTextField;

import java.awt.Color;

import javax.swing.border.LineBorder;

import java.awt.SystemColor;

import javax.swing.UIManager;
import javax.swing.border.MatteBorder;
import javax.swing.border.SoftBevelBorder;
import javax.swing.border.BevelBorder;
import javax.swing.border.EtchedBorder;
import javax.swing.JPasswordField;

import java.awt.event.ActionListener;
import java.awt.event.ActionEvent;
import java.util.ArrayList;

import javax.swing.ImageIcon;

import logica.Administrador;
import logica.ComisionElectoral;
import logica.Usuario;
import logica.Votante;

public class InicioSesion extends JDialog {

	private final JPanel contentPanel = new JPanel();
	private JTextField textFieldUsuario;
	private JPasswordField contrasennnaField;
	private JLabel errorMensaje;
	private JTextField textFieldContrasennna;
	private boolean contrasennna_visible = false;
	private ComisionElectoral CE;
	private JLabel errorYaVoto;
	private Principal frame;
	private JLabel errorVotacion;

	public InicioSesion(ComisionElectoral CE1, Principal frame1) {
		setResizable(false);
		setFont(new Font("SansSerif", Font.PLAIN, 18));
		setIconImage(Toolkit.getDefaultToolkit().getImage(InicioSesion.class.getResource("/imagenes/logo_cujae.jpg")));
		this.CE = CE1;
		frame = frame1;
		setTitle("Inicio de sesión");
		setBounds(100, 100, 408, 388);
		getContentPane().setLayout(new BorderLayout());
		contentPanel.setBackground(new Color(143, 182, 155));
		contentPanel.setBorder(null);
		getContentPane().add(contentPanel, BorderLayout.CENTER);
		contentPanel.setLayout(null);

		setLocationRelativeTo(null);

		{
			JPanel panel = new JPanel() {
				public void paintComponent(Graphics g) {
					Image img = Toolkit.getDefaultToolkit()
							.getImage(InicioSesion.class.getResource("/imagenes/logo_cujae.jpg"));
					g.drawImage(img, 0, 0, this.getWidth(), this.getHeight(), this);
				}
			};
			panel.setBorder(new SoftBevelBorder(BevelBorder.LOWERED, null, null, null, null));
			panel.setBounds(169, 16, 63, 63);
			contentPanel.add(panel);
		}
		{
			JPanel panel = new JPanel();
			panel.setBackground(new Color(143, 182, 155));
			panel.setBorder(new MatteBorder(5, 5, 5, 5, (Color) new Color(35, 83, 71)));
			panel.setBounds(40, 97, 319, 144);
			contentPanel.add(panel);
			panel.setLayout(null);
			{
				JLabel lblUsuarioOCorreo = new JLabel("Usuario o correo:");
				lblUsuarioOCorreo.setFont(new Font("SansSerif", Font.PLAIN, 18));
				lblUsuarioOCorreo.setBounds(24, 16, 155, 20);
				panel.add(lblUsuarioOCorreo);
			}
			{
				JLabel lblContrasea = new JLabel("Contraseña:");
				lblContrasea.setFont(new Font("SansSerif", Font.PLAIN, 18));
				lblContrasea.setBounds(24, 70, 132, 20);
				panel.add(lblContrasea);
			}

			textFieldUsuario = new JTextField();
			textFieldUsuario.setFont(new Font("SansSerif", Font.PLAIN, 18));
			textFieldUsuario.setBounds(24, 38, 271, 30);
			panel.add(textFieldUsuario);
			textFieldUsuario.setColumns(10);

			contrasennnaField = new JPasswordField();
			contrasennnaField.setFont(new Font("SansSerif", Font.PLAIN, 18));
			contrasennnaField.setBounds(24, 94, 251, 30);
			panel.add(contrasennnaField);
			{
				textFieldContrasennna = new JTextField();
				textFieldContrasennna.setFont(new Font("SansSerif", Font.PLAIN, 18));
				textFieldContrasennna.setBounds(24, 94, 251, 30);
				panel.add(textFieldContrasennna);
				textFieldContrasennna.setColumns(10);
				{
					JButton btnOjo = new JButton("");

					btnOjo.setBackground(UIManager.getColor("Button.background"));
					btnOjo.setBounds(285, 98, 21, 21);
					panel.add(btnOjo);
					btnOjo.setIcon(new ImageIcon(InicioSesion.class.getResource("/imagenes/eye_nonvisible.png")));
					btnOjo.addActionListener(new ActionListener() {
						public void actionPerformed(ActionEvent arg0) {
							String contrasenna;
							if (!contrasennna_visible) {
								contrasenna = contrasennnaField.getText();
								contrasennnaField.setVisible(false);
								textFieldContrasennna.setVisible(true);
								textFieldContrasennna.setText(contrasenna);
								contrasennna_visible = true;
							} else {
								contrasenna = textFieldContrasennna.getText();
								textFieldContrasennna.setVisible(false);
								contrasennnaField.setVisible(true);
								contrasennnaField.setText(contrasenna);
								contrasennna_visible = false;

							}
						}
					});
				}
				textFieldContrasennna.setVisible(false);
			}
		}
		{
			errorMensaje = new JLabel("Nombre de usuario o contraseña incorrectos");
			errorMensaje.setFont(new Font("SansSerif", Font.PLAIN, 18));
			errorMensaje.setForeground(new Color(20,57,49));
			errorMensaje.setBounds(15, 257, 367, 14);
			contentPanel.add(errorMensaje);

			errorYaVoto = new JLabel("Este usuario ya ha votado");
			errorYaVoto.setFont(new Font("SansSerif", Font.PLAIN, 20));
			errorYaVoto.setForeground(new Color(20,57,49));
			errorYaVoto.setBounds(89, 257, 237, 26);
			contentPanel.add(errorYaVoto);
			{
				errorVotacion = new JLabel("Votaciones cerradas");
				errorVotacion.setFont(new Font("SansSerif", Font.PLAIN, 20));
				errorVotacion.setVisible(false);
				errorVotacion.setForeground(new Color(20,57,49));
				errorVotacion.setBounds(110, 253, 189, 20);
				contentPanel.add(errorVotacion);
			}
			{
				JButton okButton = new JButton("Iniciar sesión");
				okButton.setBounds(89, 299, 150, 33);
				contentPanel.add(okButton);
				okButton.setBackground(Color.WHITE);
				okButton.addActionListener(new ActionListener() {
					public void actionPerformed(ActionEvent arg0) {
						Votante vot;
						Administrador adm;
						String usuario = textFieldUsuario.getText();
						String contrasenna;
						if (!contrasennna_visible) {
							contrasenna = contrasennnaField.getText();
						} else {
							contrasenna = textFieldContrasennna.getText();
						}

						adm = esAdmin(usuario, contrasenna);
						vot = esVotante(usuario, contrasenna);

						if (frame.getEstadoVotacion() == false && adm == null) {
							errorVotacion.setVisible(true);
						} else if (vot != null) {
							if (((Votante) vot).getYaVoto() == false) {

								frame.mnArchivo.setText(usuario);
								frame.mnArchivo.setForeground(Color.BLACK);
								frame.mnArchivo.setFont(new Font("SansSerif", Font.BOLD | Font.ITALIC, 23));

								Boleta_Inter boleta = new Boleta_Inter(CE, vot);
								boleta.setModal(true);
								boleta.setDefaultCloseOperation(JDialog.DISPOSE_ON_CLOSE);
								boleta.setVisible(true);
								dispose();

								frame.mnArchivo.setText("Archivo");
								frame.mnArchivo.setForeground(new Color(20,57,49));
								frame.mnArchivo.setFont(new Font("SansSerif", Font.BOLD, 23));
							} else {
								errorMensaje.setVisible(false);
								errorYaVoto.setVisible(true);
							}
						} else {
							if (adm != null) {
								frame.mnGestion.setVisible(true);
								frame.mntmListaDeBoletas.setVisible(true);
								frame.mntmVerBoleta.setVisible(false);
								frame.mntmCerrarSesion.setEnabled(true);
								frame.mntmIniciarSesion.setEnabled(false);
								if (!frame.getEstadoVotacion()) {
									frame.mntmConteoMiembros.setVisible(true);
									frame.mntmConteoPresidentes.setVisible(true);
								}

								frame.mnArchivo.setText(usuario);
								frame.mnArchivo.setForeground(Color.BLACK);
								frame.mnArchivo.setFont(new Font("SansSerif", Font.BOLD | Font.ITALIC, 23));
								dispose();
							} else {
								errorYaVoto.setVisible(false);
								errorMensaje.setVisible(true);
							}
						}

					}
				});
				okButton.setFont(new Font("SansSerif", Font.PLAIN, 18));
				okButton.setActionCommand("OK");
				getRootPane().setDefaultButton(okButton);
			}
			{
				JButton cancelButton = new JButton("Cancelar");
				cancelButton.setBounds(254, 299, 111, 33);
				contentPanel.add(cancelButton);
				cancelButton.setBackground(Color.WHITE);
				cancelButton.addActionListener(new ActionListener() {
					public void actionPerformed(ActionEvent arg0) {
						dispose();
					}
				});
				cancelButton.setFont(new Font("SansSerif", Font.PLAIN, 18));
				cancelButton.setActionCommand("Cancel");
			}

			errorMensaje.setVisible(false);
			errorYaVoto.setVisible(false);
		}
	}

	public Votante esVotante(String nombre, String contrasenna) {
		ArrayList<Usuario> lista = CE.getUsuarios();
		boolean encont = false;
		int i = 0;
		Usuario pos = null;

		while (i < lista.size() && !encont) {
			pos = lista.get(i);
			if (pos instanceof Votante) {
				if ((nombre.equals(pos.getNombre()) || nombre.equals(pos.getCorreo()))
						&& contrasenna.equals(pos.getContrasenna()))
					encont = true;
				else
					i++;
			} else
				i++;
		}
		return (Votante) (encont ? pos : null);
	}

	public Administrador esAdmin(String nombre, String contrasenna) {
		ArrayList<Usuario> lista = CE.getUsuarios();
		boolean encont = false;
		int i = 0;
		Usuario pos = null;

		while (i < lista.size() && !encont) {
			pos = lista.get(i);
			if (pos instanceof Administrador) {
				if ((nombre.equals(pos.getNombre()) || nombre.equals(pos.getCorreo()))
						&& contrasenna.equals(pos.getContrasenna()))
					encont = true;
				else
					i++;
			} else
				i++;
		}
		return (Administrador) (encont ? pos : null);
	}
}
