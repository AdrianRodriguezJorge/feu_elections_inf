package interfaz;

import java.awt.BorderLayout;
import java.awt.FlowLayout;

import logica.*;

import javax.swing.JButton;
import javax.swing.JDialog;
import javax.swing.JPanel;
import javax.swing.border.EmptyBorder;
import javax.swing.border.TitledBorder;
import javax.swing.event.ListSelectionEvent;
import javax.swing.event.ListSelectionListener;

import auxiliar.Model_Candidato;

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
import java.awt.Color;
import java.awt.event.KeyAdapter;
import java.awt.event.KeyEvent;
import auxiliar.JTextFieldMejorado;
import javax.swing.SwingConstants;
import java.awt.Insets;
import java.awt.SystemColor;
import javax.swing.border.MatteBorder;

public class GestionCandidato extends JDialog {
	private final JPanel contentPanel = new JPanel();
	private JTextField textFieldNombre;
	private JTextField textFieldApellidos;

	private JComboBox comboBoxGenero;
	private JComboBox comboBoxFacultad;
	private JComboBox comboBoxAnno;

	private JButton btnNuevo;
	private JButton btnEliminar;
	private JButton btnSalir;
	private JButton btnAgregar;
	private JButton btnEditar;

	private JList<Candidato> list = new JList<Candidato>();

	private Model_Candidato modelo = new Model_Candidato();
	private JPanel panel;
	private JButton btnGuardar;
	private JLabel lblDescripcion;
	private JTextArea textAreaDesc;
	private JLabel lblDatosErroneos;
	private JLabel lblNombre;
	private JLabel lblApellidos;
	private JLabel lblCi;
	private JLabel lblBrigada;
	private JLabel lblCiYaRegistrado;
	private JTextFieldMejorado textFieldBrigada;
	private JTextFieldMejorado textFieldCI;
	private ComisionElectoral CE;
	private JButton btnCancelar;
	private JScrollPane scrollPane_1;

	public GestionCandidato(ComisionElectoral CE1) {
		setResizable(false);
		this.CE = CE1;
		setFont(new Font("SansSerif", Font.PLAIN, 18));
		setTitle("Gestión de candidatos");
		setIconImage(Toolkit.getDefaultToolkit()
				.getImage(GestionCandidato.class.getResource("/imagenes/logo_cujae.jpg")));
		setBounds(100, 100, 812, 517);
		getContentPane().setLayout(new BorderLayout());
		contentPanel.setBackground(new Color(143, 182, 155));
		contentPanel.setBorder(new MatteBorder(5, 5, 5, 5, (Color) new Color(35, 83, 71)));
		getContentPane().add(contentPanel, BorderLayout.CENTER);
		contentPanel.setLayout(null);

		UIManager.put("ComboBox.disabledForeground", Color.BLACK);

		JScrollPane scrollPane = new JScrollPane();
		scrollPane.setBounds(12, 16, 348, 364);
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
					Candidato c = modelo.getCandidatoAt(indice);

					textFieldNombre.setText(c.getNombre());
					textFieldApellidos.setText(c.getApellidos());
					textFieldCI.setText(c.getCI());
					textFieldBrigada.setText(Integer.toString(c.getBrigada()));
					textAreaDesc.setText(c.getDescripcion());

					mostrarGenero(modelo.getCandidatoAt(indice).getGenero());

					mostrarFacultad(modelo.getCandidatoAt(indice).getFacultad());

					mostrarAnno(modelo.getCandidatoAt(indice).getAnno());

					btnNuevo.setEnabled(true);
					btnEditar.setEnabled(true);

				} else {
					btnEditar.setEnabled(false);
				}
			}
		});
		modelo.setlstCandidatos(CE.getCandidatosActivos());

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
				if (list.getSelectedIndex() != -1)
					if (JOptionPane.showConfirmDialog(null, "Está seguro que desea eliminar este Candidato?",
							"Confirmar", 0) == 0) {
						modelo.removeCandidato(list.getSelectedIndex());
						limpiar();
						desactivar_habilitar(false);
					}
			}
		});
		contentPanel.add(btnEliminar);

		// #region JPanel con los datos del candidato
		panel = new JPanel();
		panel.setBackground(new Color(143, 182, 155));
		panel.setBounds(375, 16, 400, 374);
		contentPanel.add(panel);
		panel.setBorder(new TitledBorder(new MatteBorder(1, 1, 1, 1, (Color) new Color(0, 0, 0)), "Datos del candidato", TitledBorder.LEADING, TitledBorder.TOP, new Font("SansSerif", Font.PLAIN, 17), new Color(0, 0, 0)));
		panel.setLayout(null);

		lblNombre = new JLabel("Nombre");
		lblNombre.setFont(new Font("SansSerif", Font.PLAIN, 18));
		lblNombre.setBounds(45, 32, 64, 14);
		panel.add(lblNombre);

		lblApellidos = new JLabel("Apellidos");
		lblApellidos.setFont(new Font("SansSerif", Font.PLAIN, 18));
		lblApellidos.setBounds(34, 61, 75, 21);
		panel.add(lblApellidos);

		JLabel lblGnero = new JLabel("Género");
		lblGnero.setFont(new Font("SansSerif", Font.PLAIN, 18));
		lblGnero.setBounds(49, 117, 60, 14);
		panel.add(lblGnero);

		lblCi = new JLabel("CI");
		lblCi.setFont(new Font("SansSerif", Font.PLAIN, 18));
		lblCi.setBounds(91, 92, 18, 14);
		panel.add(lblCi);

		JLabel lblFacultad = new JLabel("Facultad");
		lblFacultad.setFont(new Font("SansSerif", Font.PLAIN, 18));
		lblFacultad.setBounds(40, 147, 69, 14);
		panel.add(lblFacultad);

		JLabel lblAoEscolar = new JLabel("Año escolar");
		lblAoEscolar.setFont(new Font("SansSerif", Font.PLAIN, 18));
		lblAoEscolar.setBounds(15, 175, 99, 14);
		panel.add(lblAoEscolar);

		textFieldNombre = new JTextField();
		textFieldNombre.setFont(new Font("SansSerif", Font.PLAIN, 18));
		textFieldNombre.setBounds(124, 28, 225, 25);
		panel.add(textFieldNombre);
		textFieldNombre.setColumns(10);
		soloLetras(textFieldNombre);

		textFieldApellidos = new JTextField();
		textFieldApellidos.setFont(new Font("SansSerif", Font.PLAIN, 18));
		textFieldApellidos.setBounds(124, 58, 225, 25);
		panel.add(textFieldApellidos);
		textFieldApellidos.setColumns(10);
		soloLetras(textFieldApellidos);

		textFieldCI = new JTextFieldMejorado();
		textFieldCI.setFont(new Font("SansSerif", Font.PLAIN, 18));
		textFieldCI.setLimite(11);
		textFieldCI.setEditable(false);
		textFieldCI.setBounds(124, 87, 117, 25);
		panel.add(textFieldCI);
		soloNum(textFieldCI); // solo permite la entrada de números

		comboBoxGenero = new JComboBox();
		comboBoxGenero.setFont(new Font("SansSerif", Font.PLAIN, 18));
		comboBoxGenero.setModel(new DefaultComboBoxModel(new String[] { "Masculino", "Femenino" }));
		comboBoxGenero.setSelectedIndex(0);
		comboBoxGenero.setBounds(124, 116, 117, 25);
		panel.add(comboBoxGenero);

		lblBrigada = new JLabel("Brigada");
		lblBrigada.setFont(new Font("SansSerif", Font.PLAIN, 18));
		lblBrigada.setBounds(45, 200, 64, 23);
		panel.add(lblBrigada);

		lblDescripcion = new JLabel("Descripción");
		lblDescripcion.setFont(new Font("SansSerif", Font.PLAIN, 18));
		lblDescripcion.setBounds(15, 235, 99, 23);
		panel.add(lblDescripcion);

		scrollPane_1 = new JScrollPane();
		scrollPane_1.setBounds(124, 235, 261, 82);
		panel.add(scrollPane_1);

		textAreaDesc = new JTextArea(3, 20);
		textAreaDesc.setBackground(SystemColor.control);
		textAreaDesc.setMargin(new Insets(4, 4, 3, 3));
		textAreaDesc.setToolTipText("(opcional)");
		textAreaDesc.setLineWrap(true); // se ajusta automáticamente a la siguiente línea
		textAreaDesc.setWrapStyleWord(true); // se ajusta a la longitud del área
		textAreaDesc.setFont(new Font("SansSerif", Font.PLAIN, 18));
		textAreaDesc.setColumns(10);
		scrollPane_1.setViewportView(textAreaDesc);

		comboBoxFacultad = new JComboBox();
		comboBoxFacultad.setBounds(124, 143, 225, 25);
		panel.add(comboBoxFacultad);
		comboBoxFacultad.setFont(new Font("SansSerif", Font.PLAIN, 18));
		comboBoxFacultad.setModel(new DefaultComboBoxModel(
				new String[] { "Arquitectura", "Automática y Biomédica", "Civil", "Eléctrica",
						"Industrial", "Informática", "Mecánica", "Química", "Telecomunicaciones" }));

		comboBoxAnno = new JComboBox();
		comboBoxAnno.setBounds(124, 170, 46, 25);
		panel.add(comboBoxAnno);
		comboBoxAnno.setFont(new Font("SansSerif", Font.PLAIN, 18));
		comboBoxAnno.setModel(new DefaultComboBoxModel(new String[] { "1", "2", "3", "4" }));

		textFieldBrigada = new JTextFieldMejorado();
		textFieldBrigada.setEditable(false);
		textFieldBrigada.setFont(new Font("SansSerif", Font.PLAIN, 18));
		textFieldBrigada.setLimite(2);
		textFieldBrigada.setBounds(123, 198, 30, 25);
		panel.add(textFieldBrigada);
		soloNum(textFieldBrigada); // solo permite la entrada de números

		// #endregion

		btnAgregar = new JButton("Agregar");
		btnAgregar.setBackground(Color.WHITE);
		btnAgregar.setFont(new Font("SansSerif", Font.PLAIN, 18));
		btnAgregar.setVisible(false);
		btnAgregar.setBounds(15, 329, 121, 29);
		btnAgregar.addActionListener(new ActionListener() {
			public void actionPerformed(ActionEvent e) {

				lblCiYaRegistrado.setVisible(false);
				String nom = textFieldNombre.getText();
				String apell = textFieldApellidos.getText();
				String ci = textFieldCI.getText();
				int anno = Integer.parseInt((String) comboBoxAnno.getSelectedItem());
				int br = Integer.parseInt(!textFieldBrigada.getText().isEmpty() ? textFieldBrigada.getText() : "0");

				boolean proceder = validarDatos(nom, apell, ci, anno, br);

				if (proceder) {
					if (CE.buscarCI(ci, -1)) {
						lblCiYaRegistrado.setVisible(true);
					} else {
						Candidato x = new Candidato(nom, apell, ci,
								(String) comboBoxGenero.getSelectedItem(),
								(String) comboBoxFacultad.getSelectedItem(),
								anno, br, textAreaDesc.getText());
						modelo.addCandidato(x);
						desactivar_habilitar(false);
						list.setEnabled(true);
						btnEliminar.setEnabled(true);
						btnEditar.setEnabled(true);
						btnNuevo.setEnabled(true);

						btnAgregar.setVisible(false);
						btnCancelar.setVisible(false);
					}
				}
			}
		});
		panel.add(btnAgregar);

		btnGuardar = new JButton("Guardar");
		btnGuardar.setBackground(Color.WHITE);
		btnGuardar.setFont(new Font("SansSerif", Font.PLAIN, 18));
		btnGuardar.setVisible(false);
		btnGuardar.setBounds(15, 329, 116, 29);
		btnGuardar.addActionListener(new ActionListener() {
			public void actionPerformed(ActionEvent e) {
				int indice = list.getSelectedIndex();

				lblCiYaRegistrado.setVisible(false);
				String nom = textFieldNombre.getText();
				String apell = textFieldApellidos.getText();
				String ci = textFieldCI.getText();
				int anno = Integer.parseInt((String) comboBoxAnno.getSelectedItem());
				int br = Integer.parseInt(!textFieldBrigada.getText().isEmpty() ? textFieldBrigada.getText() : "0"); // si es vacio le doy valor 0 para que salte la excepción

				boolean proceder = validarDatos(nom, apell, ci, anno, br);

				if (proceder) {
					if (CE.buscarCI(ci, list.getSelectedIndex())) {
						lblCiYaRegistrado.setVisible(true);
					} else {
						lblCiYaRegistrado.setVisible(false);
						Candidato x = new Candidato(nom, apell, ci,
								(String) comboBoxGenero.getSelectedItem(),
								(String) comboBoxFacultad.getSelectedItem(),
								anno, br, textAreaDesc.getText());
						modelo.updateCandidato(indice, x);
						desactivar_habilitar(false);
						list.setEnabled(true);
						btnEliminar.setEnabled(true);
						btnEditar.setEnabled(true);
						btnNuevo.setEnabled(true);

						btnGuardar.setVisible(false);
						btnCancelar.setVisible(false);
					}
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
				lblApellidos.setForeground(Color.BLACK);
				lblCi.setForeground(Color.BLACK);
				lblBrigada.setForeground(Color.BLACK);
				lblDatosErroneos.setVisible(false);
			}
		});
		btnCancelar.setFont(new Font("SansSerif", Font.PLAIN, 18));
		btnCancelar.setBounds(264, 333, 121, 29);
		panel.add(btnCancelar);

		btnSalir = new JButton("Salir");
		btnSalir.setBackground(Color.WHITE);
		btnSalir.setBounds(686, 406, 89, 29);
		btnSalir.setFont(new Font("SansSerif", Font.PLAIN, 18));
		btnSalir.addActionListener(new ActionListener() {
			public void actionPerformed(ActionEvent e) {
				dispose();
			}
		});
		contentPanel.add(btnSalir);

		lblDatosErroneos = new JLabel("Datos erroneos");
		lblDatosErroneos.setForeground(new Color(0, 0, 139));
		lblDatosErroneos.setFont(new Font("SansSerif", Font.BOLD, 22));
		lblDatosErroneos.setBounds(404, 390, 200, 50);
		lblDatosErroneos.setVisible(false);
		contentPanel.add(lblDatosErroneos);

		lblCiYaRegistrado = new JLabel("CI ya registrado");
		lblCiYaRegistrado.setFont(new Font("SansSerif", Font.BOLD, 22));
		lblCiYaRegistrado.setVisible(false);
		lblCiYaRegistrado.setForeground(new Color(0, 0, 139));
		lblCiYaRegistrado.setBounds(404, 391, 200, 50);
		contentPanel.add(lblCiYaRegistrado);

		desactivar_habilitar(false);
	}

	public void limpiar() {
		textFieldNombre.setText("");
		textFieldApellidos.setText("");
		textFieldCI.setText("");
		textFieldBrigada.setText("");
		textAreaDesc.setText("");
		textFieldNombre.requestFocusInWindow();
		comboBoxFacultad.setSelectedIndex(0);
		comboBoxGenero.setSelectedIndex(0);
		comboBoxAnno.setSelectedIndex(0);
	}

	public void mostrarFacultad(String facultad) // actualiza el comBox de Facultad
	{
		int index = 0;
		switch (facultad) {

			case "Arquitectura":
				index = 0;
				break;
			case "Automática y Biomédica":
				index = 1;
				break;
			case "Civil":
				index = 2;
				break;
			case "Eléctrica":
				index = 3;
				break;
			case "Industrial":
				index = 4;
				break;
			case "Informática":
				index = 5;
				break;
			case "Mecánica":
				index = 6;
				break;
			case "Química":
				index = 7;
				break;
			case "Telecomunicaciones":
				index = 8;
				break;
		}
		comboBoxFacultad.setSelectedIndex(index);
	}

	public void mostrarGenero(String genero) // actualiza el comBox de Genero
	{
		int index = 0;
		switch (genero) {

			case "Masculino":
				index = 0;
				break;
			case "Femenino":
				index = 1;
				break;
		}
		comboBoxGenero.setSelectedIndex(index);
	}

	public void mostrarAnno(int anno) // actualiza el comBox de Anno
	{
		int index = 0;
		switch (anno) {

			case 1:
				index = 0;
				break;
			case 2:
				index = 1;
				break;
			case 3:
				index = 2;
				break;
			case 4:
				index = 3;
				break;
		}
		comboBoxAnno.setSelectedIndex(index);
	}

	public void desactivar_habilitar(boolean estado) {
		textFieldNombre.setEditable(estado);
		textFieldApellidos.setEditable(estado);
		textFieldCI.setEditable(estado);
		textAreaDesc.setEditable(estado);
		comboBoxFacultad.setEnabled(estado);
		comboBoxGenero.setEnabled(estado);
		comboBoxAnno.setEnabled(estado);
		textFieldBrigada.setEditable(estado);
		textAreaDesc.setBackground(estado ? Color.WHITE : SystemColor.control);
	}

	public boolean validarDatos(String n, String a, String ci, int anno, int br) {
		boolean correcto = true;
		Candidato temp = new Candidato();
		temp.setAnno(anno);

		try { // nombre
			lblNombre.setForeground(Color.BLACK);
			temp.setNombre(n);
		} catch (IllegalArgumentException e) {
			correcto = false;
			lblDatosErroneos.setVisible(true);
			lblNombre.setForeground(new Color(0,0,139));
		}

		try { // apellidos
			lblApellidos.setForeground(Color.BLACK);
			temp.setApellidos(a);
		} catch (IllegalArgumentException e) {
			correcto = false;
			lblDatosErroneos.setVisible(true);
			lblApellidos.setForeground(new Color(0,0,139));
		}

		try { // ci
			lblCi.setForeground(Color.BLACK);
			temp.setCI(ci);
		} catch (IllegalArgumentException e) {
			correcto = false;
			lblDatosErroneos.setVisible(true);
			lblCi.setForeground(new Color(0,0,139));
		}

		try { // brigada
			lblBrigada.setForeground(Color.BLACK);
			temp.setBrigada(br);
		} catch (IllegalArgumentException e) {
			correcto = false;
			lblDatosErroneos.setVisible(true);
			lblBrigada.setForeground(new Color(0,0,139));
		}

		if (correcto) {
			lblDatosErroneos.setVisible(false);
		}
		return correcto;
	}

	// metodo que usa un textbox como parametro y que recibirá solo numeros
	public static void soloNum(JTextField a) {
		a.addKeyListener(new KeyAdapter() {
			public void keyTyped(KeyEvent e) {
				char c = e.getKeyChar();
				if (!Character.isDigit(c)) {
					e.consume();
				}
			}
		});
	}

	// metodo que usa un textbox como parametro y que recibirá solo letras
	public static void soloLetras(JTextField a) {
		a.addKeyListener(new KeyAdapter() {
			public void keyTyped(KeyEvent e) {
				char c = e.getKeyChar();
				if (!Character.isAlphabetic(c)) {
					e.consume();
				}
			}
		});
	}
}