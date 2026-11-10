package interfaz;

import java.awt.BorderLayout;
import java.awt.FlowLayout;

import logica.*;
import interfaz.*;

import javax.swing.JButton;
import javax.swing.JDialog;
import javax.swing.JPanel;
import javax.swing.border.EmptyBorder;
import javax.swing.border.TitledBorder;
import javax.swing.event.ListSelectionEvent;
import javax.swing.event.ListSelectionListener;

import auxiliar.Model_Usuario;

import javax.swing.JList;
import javax.swing.JOptionPane;
import javax.swing.JLabel;

import java.awt.event.ActionListener;
import java.util.ArrayList;
import java.awt.event.ActionEvent;

import javax.swing.JTextField;
import javax.swing.ListSelectionModel;
import javax.swing.UIManager;
import javax.swing.JComboBox;
import javax.swing.DefaultComboBoxModel;
import javax.swing.JScrollPane;
import java.awt.Toolkit;
import javax.swing.JTextArea;
import java.awt.Font;
import java.awt.Label;
import java.awt.TextArea;
import java.awt.TextField;
import java.awt.Color;
import java.awt.event.KeyAdapter;
import java.awt.event.KeyEvent;
import auxiliar.JTextFieldMejorado;
import javax.swing.SwingConstants;
import java.awt.Insets;
import java.awt.SystemColor;
import javax.swing.border.MatteBorder;

public class GestionUsuario extends JDialog {
	private final JPanel contentPanel = new JPanel();

	private JLabel lblDatosErroneos;
	private JLabel lblNombre;
	private JLabel lblCorreo;
	private JLabel lblContrasenna;
	private JTextField textFieldNombre;
	private JTextField textFieldCorreo;
	private JTextField textFieldCont;

	private JButton btnNuevo;
	private JButton btnEliminar;
	private JButton btnSalir;
	private JButton btnAgregar;
	private JButton btnEditar;
	private JButton btnCancelar;
	private JButton btnGuardar;

	private JList<Usuario> list = new JList<Usuario>();
	private Model_Usuario modelo = new Model_Usuario();
	private JPanel panel;
	private ComisionElectoral CE;

	public GestionUsuario(ComisionElectoral CE1) {
		setResizable(false);
		this.CE = CE1;
		setFont(new Font("SansSerif", Font.PLAIN, 18));
		setTitle("Gestión de usuarios");
		setIconImage(Toolkit.getDefaultToolkit()
				.getImage(GestionUsuario.class.getResource("/imagenes/logo_cujae.jpg")));
		setBounds(100, 100, 678, 505);
		getContentPane().setLayout(new BorderLayout());
		contentPanel.setBackground(new Color(143, 182, 155));
		contentPanel.setBorder(new MatteBorder(5, 5, 5, 5, (Color) new Color(35, 83, 71)));
		getContentPane().add(contentPanel, BorderLayout.CENTER);
		contentPanel.setLayout(null);

		JScrollPane scrollPane = new JScrollPane();
		scrollPane.setBounds(12, 16, 286, 364);
		contentPanel.add(scrollPane);
		scrollPane.setViewportView(list);
		list.setFont(new Font("SansSerif", Font.PLAIN, 18));
		list.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);
		list.setModel(modelo);

		list.addListSelectionListener(new ListSelectionListener() {
			public void valueChanged(ListSelectionEvent e) {
				int indice = list.getSelectedIndex();
				btnEliminar.setEnabled(indice > -1);
				desactivar_habilitar(indice <= -1);
				if (indice > -1) {
					Usuario c = modelo.getUsuarioAt(indice);

					textFieldNombre.setText(c.getNombre());
					textFieldCorreo.setText(c.getCorreo());
					textFieldCont.setText(c.getContrasenna());

					btnNuevo.setEnabled(true);
					btnEditar.setEnabled(true);

				} else {
					btnEditar.setEnabled(false);
				}
			}
		});
		modelo.setlstUsuarios(CE.getUsuarios());

		btnNuevo = new JButton("Nuevo");
		btnNuevo.setBackground(Color.WHITE);
		btnNuevo.setBounds(22, 406, 89, 29);
		btnNuevo.setFont(new Font("SansSerif", Font.PLAIN, 18));
		btnNuevo.addActionListener(new ActionListener() {
			public void actionPerformed(ActionEvent e) {
				limpiar();
				btnAgregar.setVisible(true);
				desactivar_habilitar(true);
				list.setEnabled(false);
				textFieldNombre.requestFocusInWindow();
				btnEliminar.setEnabled(false);
				btnNuevo.setEnabled(false);
				btnEditar.setEnabled(false);
				btnGuardar.setVisible(true);
				btnCancelar.setVisible(true);
			}
		});
		contentPanel.add(btnNuevo);

		btnEditar = new JButton("Editar");
		btnEditar.setBackground(Color.WHITE);
		btnEditar.setBounds(126, 406, 89, 29);
		btnEditar.setFont(new Font("SansSerif", Font.PLAIN, 18));
		btnEditar.setEnabled(false);
		btnEditar.addActionListener(new ActionListener() {
			public void actionPerformed(ActionEvent e) {
				desactivar_habilitar(list.getSelectedIndex() > -1);
				list.setEnabled(false);
				textFieldNombre.requestFocusInWindow();
				btnEliminar.setEnabled(false);
				btnNuevo.setEnabled(false);
				btnEditar.setEnabled(false);
				btnGuardar.setVisible(true);
				btnCancelar.setVisible(true);
			}
		});
		contentPanel.add(btnEditar);

		btnEliminar = new JButton("Eliminar");
		btnEliminar.setBackground(Color.WHITE);
		btnEliminar.setBounds(223, 406, 105, 29);
		btnEliminar.setFont(new Font("SansSerif", Font.PLAIN, 18));
		btnEliminar.setEnabled(false);
		btnEliminar.addActionListener(new ActionListener() {
			public void actionPerformed(ActionEvent e) {
				int indice = list.getSelectedIndex();
				if (CE.getUsuarios().get(indice) instanceof Administrador) 
				{
					JOptionPane.showMessageDialog(null, "No puede eliminar al administrador.","Error", 0);
				} 
				else {
					if (indice != -1) {
						if (JOptionPane.showConfirmDialog(null, "Está seguro que desea eliminar este usuario?",
								"Confirmar", 0) == 0) {
							modelo.removeUsuario(list.getSelectedIndex());
							limpiar();
							desactivar_habilitar(false);
						}
					}
				}
			}
		});
		contentPanel.add(btnEliminar);

		// #region JPanel con los datos del usuario
		panel = new JPanel();
		panel.setBackground(new Color(143, 182, 155));
		panel.setBounds(313, 20, 327, 189);
		contentPanel.add(panel);
		panel.setBorder(new TitledBorder(new MatteBorder(1, 1, 1, 1, (Color) new Color(0, 0, 0)), "Datos del usuario", TitledBorder.LEADING, TitledBorder.TOP, new Font("SansSerif", Font.PLAIN, 17), new Color(0, 0, 0)));
		panel.setLayout(null);

		lblNombre = new JLabel("Nombre");
		lblNombre.setHorizontalAlignment(SwingConstants.RIGHT);
		lblNombre.setFont(new Font("SansSerif", Font.PLAIN, 18));
		lblNombre.setBounds(51, 29, 64, 21);
		panel.add(lblNombre);

		lblCorreo = new JLabel("Correo");
		lblCorreo.setHorizontalAlignment(SwingConstants.RIGHT);
		lblCorreo.setFont(new Font("SansSerif", Font.PLAIN, 18));
		lblCorreo.setBounds(40, 61, 75, 21);
		panel.add(lblCorreo);

		lblContrasenna = new JLabel("Contraseña");
		lblContrasenna.setHorizontalAlignment(SwingConstants.RIGHT);
		lblContrasenna.setFont(new Font("SansSerif", Font.PLAIN, 18));
		lblContrasenna.setBounds(15, 99, 100, 21);
		panel.add(lblContrasenna);

		textFieldNombre = new JTextField();
		textFieldNombre.setFont(new Font("SansSerif", Font.PLAIN, 18));
		textFieldNombre.setBounds(130, 26, 184, 25);
		panel.add(textFieldNombre);
		textFieldNombre.setColumns(10);
		GestionCandidato.soloLetras(textFieldNombre);

		textFieldCorreo = new JTextField();
		textFieldCorreo.setFont(new Font("SansSerif", Font.PLAIN, 18));
		textFieldCorreo.setBounds(130, 61, 184, 25);
		panel.add(textFieldCorreo);
		textFieldCorreo.setColumns(10);

		textFieldCont = new JTextField();
		textFieldCont.setFont(new Font("SansSerif", Font.PLAIN, 18));
		textFieldCont.setEditable(false);
		textFieldCont.setBounds(130, 96, 117, 25);
		panel.add(textFieldCont);

		// #endregion

		btnAgregar = new JButton("Agregar");
		btnAgregar.setBackground(Color.WHITE);
		btnAgregar.setFont(new Font("SansSerif", Font.PLAIN, 17));
		btnAgregar.setVisible(false);
		btnAgregar.setBounds(15, 150, 95, 29);
		btnAgregar.addActionListener(new ActionListener() {
			public void actionPerformed(ActionEvent e) {

				String nom = textFieldNombre.getText();
				String correo = textFieldCorreo.getText();
				String cont = textFieldCont.getText();

				boolean proceder = validarDatos(nom, correo, cont);

				if (proceder) {
					Votante x = new Votante(nom, correo, cont);
					modelo.addUsuario(x);
					desactivar_habilitar(false);
					list.setEnabled(true);
					btnEliminar.setEnabled(true);
					btnEditar.setEnabled(true);
					btnNuevo.setEnabled(true);

					btnAgregar.setVisible(false);
					btnCancelar.setVisible(false);
				}
			}
		});
		panel.add(btnAgregar);

		btnGuardar = new JButton("Guardar");
		btnGuardar.setBackground(Color.WHITE);
		btnGuardar.setFont(new Font("SansSerif", Font.PLAIN, 17));
		btnGuardar.setVisible(false);
		btnGuardar.setBounds(15, 150, 95, 29);
		btnGuardar.addActionListener(new ActionListener() {
			public void actionPerformed(ActionEvent e) {
				int indice = list.getSelectedIndex();
				Usuario x;

				String nom = textFieldNombre.getText();
				String correo = textFieldCorreo.getText();
				String cont = textFieldCont.getText();

				boolean proceder = validarDatos(nom, correo, cont);

				if (proceder) {
					if (CE.getUsuarios().get(indice) instanceof Administrador) {
						x = new Administrador(nom, correo, cont);
					} else {
						x = new Votante(nom, correo, cont);
					}
					modelo.updateUsuario(indice, x);
					desactivar_habilitar(false);
					list.setEnabled(true);
					btnEliminar.setEnabled(true);
					btnEditar.setEnabled(true);
					btnNuevo.setEnabled(true);

					btnGuardar.setVisible(false);
					btnCancelar.setVisible(false);
				}

			}
		});
		panel.add(btnGuardar);

		btnCancelar = new JButton("Cancelar");
		btnCancelar.setBackground(Color.WHITE);
		btnCancelar.setVisible(false);
		btnCancelar.addActionListener(new ActionListener() {
			public void actionPerformed(ActionEvent e) {
				desactivar_habilitar(false);
				list.setEnabled(true);
				btnEliminar.setEnabled(true);
				btnEditar.setEnabled(true);
				btnNuevo.setEnabled(true);
				btnAgregar.setVisible(false);
				btnGuardar.setVisible(false);
				btnCancelar.setVisible(false);
				lblNombre.setForeground(Color.BLACK);
				lblCorreo.setForeground(Color.BLACK);
				lblContrasenna.setForeground(Color.BLACK);
				lblDatosErroneos.setVisible(false);
			}
		});
		btnCancelar.setFont(new Font("SansSerif", Font.PLAIN, 17));
		btnCancelar.setBounds(214, 150, 100, 29);
		panel.add(btnCancelar);

		btnSalir = new JButton("Salir");
		btnSalir.setBackground(Color.WHITE);
		btnSalir.setBounds(545, 406, 89, 29);
		btnSalir.setFont(new Font("SansSerif", Font.PLAIN, 18));
		btnSalir.addActionListener(new ActionListener() {
			public void actionPerformed(ActionEvent e) {
				dispose();
			}
		});
		contentPanel.add(btnSalir);

		lblDatosErroneos = new JLabel("Datos erroneos");
		lblDatosErroneos.setForeground(new Color(0,0,139));
		lblDatosErroneos.setFont(new Font("SansSerif", Font.PLAIN, 20));
		lblDatosErroneos.setBounds(330, 207, 200, 50);
		lblDatosErroneos.setVisible(false);
		contentPanel.add(lblDatosErroneos);

		desactivar_habilitar(false);
	}

	public void limpiar() {
		textFieldNombre.setText("");
		textFieldCorreo.setText("");
		textFieldCont.setText("");
	}

	public void desactivar_habilitar(boolean estado) {
		textFieldNombre.setEditable(estado);
		textFieldCorreo.setEditable(estado);
		textFieldCont.setEditable(estado);
	}

	public boolean validarDatos(String n, String correo, String cont) {
		boolean correcto = true;
		Votante temp = new Votante();

		try { // nombre
			lblNombre.setForeground(Color.BLACK);
			temp.setNombre(n);
		} catch (IllegalArgumentException e) {
			correcto = false;
			lblDatosErroneos.setVisible(true);
			lblNombre.setForeground(new Color(0,0,139));
		}

		try { // correo
			lblCorreo.setForeground(Color.BLACK);
			temp.setCorreo(correo);
		} catch (IllegalArgumentException e) {
			correcto = false;
			lblDatosErroneos.setVisible(true);
			lblCorreo.setForeground(new Color(0,0,139));
		}

		try { // contraseña
			lblContrasenna.setForeground(Color.BLACK);
			temp.setContrasenna(cont);
		} catch (IllegalArgumentException e) {
			correcto = false;
			lblDatosErroneos.setVisible(true);
			lblContrasenna.setForeground(new Color(0,0,139));
		}

		if (correcto) {
			lblDatosErroneos.setVisible(false);
		}
		return correcto;
	}
}