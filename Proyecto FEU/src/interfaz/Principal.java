package interfaz;

import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Component;
import java.awt.Dimension;
import java.awt.EventQueue;
import java.awt.Font;
import java.awt.Graphics;
import java.awt.Image;
import java.awt.PopupMenu;
import java.awt.Toolkit;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.util.ArrayList;

import javax.swing.DefaultListModel;
import javax.swing.JDialog;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JMenu;
import javax.swing.JMenuBar;
import javax.swing.JMenuItem;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JTable;
import javax.swing.JTextArea;
import javax.swing.ListSelectionModel;
import javax.swing.SwingConstants;
import javax.swing.UIManager;
import javax.swing.border.MatteBorder;
import javax.swing.table.DefaultTableCellRenderer;
import javax.swing.table.DefaultTableModel;
import javax.swing.table.JTableHeader;

import logica.Boleta;
import logica.Candidato;
import logica.ComisionElectoral;
import auxiliar.DatosTemporales;
import auxiliar.TablaCandidatos;
import auxiliar.TablaConteoMiembros;
import auxiliar.TablaConteoPresidente;
import auxiliar.TablaResultadoFinal;

public class Principal extends JFrame {

	private ComisionElectoral CE;
	public static boolean visibleAdmin;
	DatosTemporales dt = new DatosTemporales();
	private boolean votacionAbierta = false;
	public JMenuItem mntmCerrarSesion;
	public JMenu mnGestion;
	public JMenuItem mntmIniciarSesion;

	private JTable table;
	private DefaultTableModel tableModel;
	private JLabel lblTabla;

	private TablaConteoMiembros tableModelMiembros;
	private TablaConteoPresidente tableModelPresidentes;
	private TablaResultadoFinal tableModelResultados;

	JMenuItem mntmConteoMiembros;
	JMenuItem mntmConteoPresidentes;
	private JMenuItem mntmEstadisticas;
	private JMenuItem mntmResultados;
	private JMenuItem mntmCerrarVotaciones;
	JMenuItem mntmIniciarVotaciones;

	private JPanel panel;
	private JScrollPane scrollPane;
	private JMenuItem mntmControlDeCandidatos;
	JMenuItem mntmVerBoleta;
	JMenuItem mntmListaDeBoletas;
	private JLabel lblNewLabel;
	private JPanel panel_1;

	public static boolean ordenarPor_apellidos = false; // si se encuentra en false es para ordenar por la cantidad de votos por miembro
	public JMenu mnArchivo;
	private JMenuItem mntmControlDeUsuarios;
	private JTextArea textArea;
	private JMenuItem mntmReglamento;
	private JScrollPane scrollPane_1;
	private boolean inforVisible = true;
	DefaultTableCellRenderer centerRenderer;
	                                                    

	public static void main(String[] args) {
		EventQueue.invokeLater(new Runnable() {
			public void run() {
				try {
					Principal frame = new Principal();
					frame.setVisible(true);
				} catch (Exception e) {
					e.printStackTrace();
				}
			}
		});
	}

	public Principal() {
		// System.out.println(CE.getClass().getName());
		
		setResizable(false);
		setBackground(new Color(255, 250, 205));
		getContentPane().setBackground(new Color(255, 250, 205));
		getContentPane().setForeground(new Color(35,  83,  71));
		setForeground(new Color(35,  83,  71));
		setTitle("Votaciones FEU");
		setIconImage(Toolkit.getDefaultToolkit().getImage(Principal.class.getResource("/imagenes/logo.jpg")));
		this.CE = dt.getCE();
		setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
		setBounds(100, 100, 1000, 750);
		this.setExtendedState(JFrame.MAXIMIZED_BOTH);
		this.setUndecorated(true);
		
		UIManager.put("OptionPane.messageFont", new Font("SansSerif", Font.PLAIN, 18));
		UIManager.put("OptionPane.buttonFont", new Font("SansSerif", Font.PLAIN, 18));
		UIManager.put("MenuItem.selectionBackground", new Color(217,242,220));
		UIManager.put("Menu.selectionBackground", new Color(217,242,220));

		JMenuBar menuBar = new JMenuBar();
		menuBar.setBorderPainted(false);
		menuBar.setBackground(new Color(143, 182, 155));
		menuBar.setForeground(new Color(0, 0, 0));
		menuBar.setFont(new Font("SansSerif", Font.PLAIN, 20));
		setJMenuBar(menuBar);
		
		mnArchivo = new JMenu("Archivo");
		mnArchivo.setForeground(new Color(20, 57, 49));
		mnArchivo.setFont(new Font("SansSerif", Font.BOLD, 23));
		menuBar.add(mnArchivo);
		
		mntmIniciarSesion = new JMenuItem("Iniciar sesión");
		mntmIniciarSesion.setFont(new Font("SansSerif", Font.PLAIN, 22));
		mntmIniciarSesion.addActionListener(new ActionListener() {
			public void actionPerformed(ActionEvent e) {
				try {
					InicioSesion dialog = new InicioSesion(CE, Principal.this);
					dialog.setModal(true);
					dialog.setDefaultCloseOperation(JDialog.DISPOSE_ON_CLOSE);
					dialog.setVisible(true);

				} catch (Exception e1) {
					e1.printStackTrace();
				}
			}
		});
		mnArchivo.add(mntmIniciarSesion);
		
		mntmCerrarSesion = new JMenuItem("Cerrar sesión");
		mntmCerrarSesion.setFont(new Font("SansSerif", Font.PLAIN, 22));
		mntmCerrarSesion.addActionListener(new ActionListener() {
			public void actionPerformed(ActionEvent e) {
				mnGestion.setVisible(false);
				mntmIniciarSesion.setEnabled(true);
				mntmCerrarSesion.setEnabled(false);
				scrollPane.setVisible(false);
				lblTabla.setVisible(false);
				mnArchivo.setText("Archivo");
				mnArchivo.setForeground(new Color(20,57,49));
				mnArchivo.setFont(new Font("SansSerif", Font.BOLD, 23));

				mntmVerBoleta.setVisible(true);
				mntmListaDeBoletas.setVisible(false);

				if (!votacionAbierta) {
					mntmConteoMiembros.setVisible(false);
					mntmConteoPresidentes.setVisible(false);
				}
			}
		});
		mntmCerrarSesion.setEnabled(false);
		mnArchivo.add(mntmCerrarSesion);
		
		JMenuItem mntmSalir = new JMenuItem("Salir");
		mntmSalir.setFont(new Font("SansSerif", Font.PLAIN, 22));
		mntmSalir.addActionListener(new ActionListener() {
			public void actionPerformed(ActionEvent e) {
				if (JOptionPane.showConfirmDialog(null, "Está seguro que desea salir de la aplicación?",
							"Confirmar", 0) == 0) {
						dispose();
					}
				
			}
		});
		mnArchivo.add(mntmSalir);
		
		mnGestion = new JMenu("Gestión");
		mnGestion.setVisible(false);
		mnGestion.setForeground(new Color(20, 57, 49));
		mnGestion.setFont(new Font("SansSerif", Font.BOLD, 23));
		mnGestion.setToolTipText("Control de candidatos, usuarios y votaciones.");
		menuBar.add(mnGestion);
		
		mntmControlDeCandidatos = new JMenuItem("Control de candidatos");
		mntmControlDeCandidatos.setFont(new Font("SansSerif", Font.PLAIN, 22));
		mntmControlDeCandidatos.addActionListener(new ActionListener() {
			public void actionPerformed(ActionEvent e) {
				try {
					scrollPane.setVisible(false);
					lblTabla.setVisible(false);
					GestionCandidato dialog = new GestionCandidato(CE);
					dialog.setModal(true);
					dialog.setDefaultCloseOperation(JDialog.DISPOSE_ON_CLOSE);
					dialog.setVisible(true);
				} catch (Exception e1) {
					e1.printStackTrace();
				}
			}
		});
		mnGestion.add(mntmControlDeCandidatos);
		
		mntmIniciarVotaciones = new JMenuItem("Iniciar votaciones");
		mntmIniciarVotaciones.setFont(new Font("SansSerif", Font.PLAIN, 22));
		mntmIniciarVotaciones.addActionListener(new ActionListener() {
			public void actionPerformed(ActionEvent e) {
				if (CE.getCandidatosActivos().size() == 11) {
					mntmControlDeCandidatos.setEnabled(false);
					mntmControlDeUsuarios.setEnabled(false);
					mntmIniciarVotaciones.setEnabled(false);
					mntmCerrarVotaciones.setEnabled(true);
					mntmVerBoleta.setEnabled(true);
					votacionAbierta = true;

					ordenarPor_apellidos = true;
					CE.getCandidatosActivos().sort(null);

					JOptionPane.showMessageDialog(null,"Votaciones iniciadas.", "Aviso", JOptionPane.INFORMATION_MESSAGE);
				}
				else JOptionPane.showMessageDialog(null, "Deben ser 11 candidatos para poder comenzar las votaciones.", "Error", JOptionPane.ERROR_MESSAGE);
			
			}
		});
		
		mntmControlDeUsuarios = new JMenuItem("Control de usuarios");
		mntmControlDeUsuarios.addActionListener(new ActionListener() {
			public void actionPerformed(ActionEvent arg0) 
			{
				try {
					GestionUsuario dialog = new GestionUsuario(CE);
					dialog.setModal(true);
					dialog.setDefaultCloseOperation(JDialog.DISPOSE_ON_CLOSE);
					dialog.setVisible(true);
				} catch (Exception e1) {
					e1.printStackTrace();
				}
			}
		});
		mntmControlDeUsuarios.setFont(new Font("SansSerif", Font.PLAIN, 22));
		mnGestion.add(mntmControlDeUsuarios);
		mnGestion.add(mntmIniciarVotaciones);
		
		mntmCerrarVotaciones = new JMenuItem("Cerrar votaciones");
		mntmCerrarVotaciones.setFont(new Font("SansSerif", Font.PLAIN, 22));
		mntmCerrarVotaciones.setEnabled(false);
		mntmCerrarVotaciones.addActionListener(new ActionListener() {
			public void actionPerformed(ActionEvent e) {
				
				votacionAbierta = false;

				CE.conteoVotos ();
				CE.ordenarLstCandidatos ();
				TablaResultadosFinales(); 
				scrollPane.setSize(1200, 310);
				
				mntmConteoMiembros.setEnabled(true);
				mntmConteoPresidentes.setEnabled(true);
				mntmEstadisticas.setEnabled(true);
				mntmResultados.setEnabled(true);
				mntmListaDeBoletas.setEnabled(true);
				mntmIniciarVotaciones.setEnabled(false);
				mntmCerrarVotaciones.setEnabled(false);
				mntmIniciarSesion.setEnabled(false);
				mntmCerrarSesion.setEnabled(true);
				

				JOptionPane.showMessageDialog(null,"Votaciones cerradas.", "Aviso", JOptionPane.INFORMATION_MESSAGE);
			}
		});
		mnGestion.add(mntmCerrarVotaciones);
		
		JMenu mnReportes = new JMenu("Reportes");
		mnReportes.setForeground(new Color(20, 57, 49));
		mnReportes.setFont(new Font("SansSerif", Font.BOLD, 23));
		mnReportes.setToolTipText("Estadísticas y datos útiles sobre las elecciones.");
		menuBar.add(mnReportes);
		
		JMenuItem mntmMostrarCandidatos = new JMenuItem("Mostrar candidatos");
		mntmMostrarCandidatos.setFont(new Font("SansSerif", Font.PLAIN, 22));
		mntmMostrarCandidatos.addActionListener(new ActionListener() {
			public void actionPerformed(ActionEvent e) {
				scrollPane.setSize(1200, 370);
				cargarTablaConCandidatos();
			}
		});
		mnReportes.add(mntmMostrarCandidatos);
		
		mntmConteoMiembros = new JMenuItem("Conteo de votos (Miembro)");
		mntmConteoMiembros.setFont(new Font("SansSerif", Font.PLAIN, 22));
		mntmConteoMiembros.setEnabled(false);
		mntmConteoMiembros.addActionListener(new ActionListener() {
			public void actionPerformed(ActionEvent e) {
				scrollPane.setSize(1200, 370);
				cargarTablaConteoMiembros();
			}
		});
		
		mntmVerBoleta = new JMenuItem("Ver Boleta");
		mntmVerBoleta.setEnabled(false);
		mntmVerBoleta.addActionListener(new ActionListener() {
			public void actionPerformed(ActionEvent e) {
				Pedir_Boleta pb = new Pedir_Boleta(CE);
				pb.setModal(true);
				pb.setVisible(true);
			}
		});
		mntmVerBoleta.setFont(new Font("SansSerif", Font.PLAIN, 22));
		mnReportes.add(mntmVerBoleta);
		mnReportes.add(mntmConteoMiembros);
		
		mntmConteoPresidentes = new JMenuItem("Conteo de votos (Presidente)");
		mntmConteoPresidentes.setFont(new Font("SansSerif", Font.PLAIN, 22));
		mntmConteoPresidentes.setEnabled(false);
		mntmConteoPresidentes.addActionListener(new ActionListener() {
			public void actionPerformed(ActionEvent e) {
				scrollPane.setSize(1200, 370);
				cargarTablaConteoPresidente();
			}
		});
		mnReportes.add(mntmConteoPresidentes);
		
		mntmEstadisticas = new JMenuItem("Estadística de votaciones");
		mntmEstadisticas.setFont(new Font("SansSerif", Font.PLAIN, 22));
		mntmEstadisticas.setEnabled(false);
		mntmEstadisticas.addActionListener(new ActionListener() {
			public void actionPerformed(ActionEvent e) {
				int votantesEstimados = CE.getUsuarios().size() - 1;
				int votantesReales = CE.getBoletas().size();
				int  boletasValidas = CE.contarBoletasVal();
				int boletasInvalidas = votantesReales - boletasValidas;
				JOptionPane.showMessageDialog(null, "Votos estimados: "+votantesEstimados+
						"\nVotos reales: "+votantesReales+
						"\nBoletas válidas: "+boletasValidas+
						"\nBoletas inválidas: "+boletasInvalidas);
			}
		});
		mnReportes.add(mntmEstadisticas);
		
		mntmResultados = new JMenuItem("Resultados");
		mntmResultados.setFont(new Font("SansSerif", Font.PLAIN, 22));
		mntmResultados.setEnabled(false);
		mntmResultados.addActionListener(new ActionListener() {
			public void actionPerformed(ActionEvent e) {
				scrollPane.setSize(1200, 310);
				TablaResultadosFinales(); 
			}
		});
		mnReportes.add(mntmResultados);
		
		mntmListaDeBoletas = new JMenuItem("Lista de Boletas");
		mntmListaDeBoletas.setVisible(false);
		mntmListaDeBoletas.setEnabled(false);
		mntmListaDeBoletas.setFont(new Font("SansSerif", Font.PLAIN, 22));
		mntmListaDeBoletas.addActionListener(new ActionListener() {
			public void actionPerformed(ActionEvent e) {
				DefaultListModel<Integer> listaModelo = new DefaultListModel<>();
				for(Boleta b: CE.getBoletas())
					listaModelo.addElement(b.getCodigo());
				ListaBoletas lb = new ListaBoletas(listaModelo,CE);
				lb.setModal(true);
				lb.setVisible(true);
			}
		});
		mnReportes.add(mntmListaDeBoletas);
		
		JMenu mnAyuda = new JMenu("Ayuda");
		mnAyuda.setForeground(new Color(20, 57, 49));
		mnAyuda.setFont(new Font("SansSerif", Font.BOLD, 23));
		menuBar.add(mnAyuda);
		
		JMenuItem mntmAcercaDe = new JMenuItem("Acerca de");
		mntmAcercaDe.addActionListener(new ActionListener() {
			public void actionPerformed(ActionEvent e) {
				JOptionPane.showMessageDialog(null, "<html><p style = 'width: 400px;'>" + "Aplicación desarrollada por el equipo # 1, brigada 11, primer año de la carrera de ingeniería Informática, curso 2023, cualquier consulta dirigirse a cualquiera de los integrantes." + "</p></html>", "Acerca de...", JOptionPane.INFORMATION_MESSAGE);
			}
		});
		mntmAcercaDe.setFont(new Font("SansSerif", Font.PLAIN, 22));
		mnAyuda.add(mntmAcercaDe);
		
		mntmReglamento = new JMenuItem("Reglamento");
		mntmReglamento.addActionListener(new ActionListener() {
			public void actionPerformed(ActionEvent arg0) {
				inforVisible = !inforVisible;
				scrollPane_1.setVisible(inforVisible);
			}
		});
		mntmReglamento.setFont(new Font("SansSerif", Font.PLAIN, 22));
		mnAyuda.add(mntmReglamento);
		this.setVisible(true);

		panel = new JPanel() {
			public void paintComponent(Graphics g) {
				Image img = Toolkit.getDefaultToolkit().getImage(Principal.class.getResource("/imagenes/a.jpg"));
				g.drawImage(img, 0, 0, this.getWidth(), this.getHeight(), this);
			}
		};
		panel.setBorder(new MatteBorder(2, 2, 2, 2, (Color) new Color(12, 44, 39)));
		panel.setBounds(41, 81, 973, 527);
		getContentPane().add(panel, BorderLayout.CENTER);
		
		scrollPane = new JScrollPane();
		scrollPane.setBorder(null);
		scrollPane.setBounds(37, 57, 1200, 370);
		scrollPane.setBackground(new Color(255, 255, 255));
		scrollPane.setPreferredSize(new Dimension(2, 5));
		scrollPane.setFont(new Font("SansSerif", Font.PLAIN, 18));
		scrollPane.setVisible(false);
		panel.setLayout(null);

		table = new JTable();
		table.setBorder(null);
		table.setEnabled(false);
		table.setRowHeight(30);
		table.setFont(new Font("SansSerif", Font.PLAIN, 25));
		table.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);
		scrollPane.setViewportView(table);
		table.getTableHeader().setReorderingAllowed(false);

		centerRenderer = new DefaultTableCellRenderer();
		centerRenderer.setHorizontalAlignment(SwingConstants.CENTER);

		panel.add(scrollPane);

		table.setBackground(new Color(216, 241, 219));

		JTableHeader header = table.getTableHeader();
		Font headerFont = new Font("SansSerif", Font.BOLD, 25);
		header.setFont(headerFont);
		header.setBackground(new Color(143, 182, 155));

		lblTabla = new JLabel("");
		lblTabla.setBounds(280, 16, 457, 37);
		lblTabla.setForeground(new Color(217,242,220));
		lblTabla.setFont(new Font("SansSerif", Font.BOLD, 27));
		lblTabla.setVisible(false);
		panel.add(lblTabla);

		scrollPane_1 = new JScrollPane();
		scrollPane_1.setFont(new Font("SansSerif", Font.PLAIN, 18));
		scrollPane_1.setAlignmentX(Component.RIGHT_ALIGNMENT);
		scrollPane_1.setAlignmentY(Component.BOTTOM_ALIGNMENT);
		scrollPane_1.setBounds(1300, 400, 600, 582);
		scrollPane_1.setBorder(new MatteBorder(1, 1, 1, 1, (Color) new Color(0, 0, 0)));
		panel.add(scrollPane_1);
		
		textArea = new JTextArea(3,20);
		textArea.setMargin(new java.awt.Insets(5, 20, 5, 10));
		textArea.setEditable(false);
		textArea.setAlignmentY(Component.BOTTOM_ALIGNMENT);
		textArea.setAlignmentX(Component.RIGHT_ALIGNMENT);
		textArea.setLineWrap(true); // se ajusta automáticamente a la siguiente línea
		textArea.setWrapStyleWord(true); // se ajusta a la longitud del área
		textArea.setFont(new Font("SansSerif", Font.PLAIN, 24));
		textArea.setForeground(new Color(0, 0, 0));
		textArea.setBackground(new Color(143, 182, 155));
		try {
			File doc = new File("Información.txt");
			BufferedReader lector = new BufferedReader(new FileReader(doc));
			String linea;
			while ((linea = lector.readLine()) != null) {
				textArea.append(linea + "\n");
			}
			lector.close();
		} catch (IOException e) {
			e.printStackTrace();
		}
		scrollPane_1.setViewportView(textArea);
		textArea.setCaretPosition(0);
	}

	public int contarBoletasVal(){
		int cant = 0;
		for(Boleta b: CE.getBoletas())
			if(b.getValidez())
				cant++;
		return cant;
	}
	public void cargarTablaConCandidatos(){		
		ArrayList<Candidato> candidatos = CE.getCandidatosActivos();
		Candidato[] valores = new Candidato[candidatos.size()];
		int i = 0;
		for (Candidato c : candidatos){
			valores[i] = c;	
			i++;
		}
		tableModel = new TablaCandidatos(valores);
		lblTabla.setText("Candidatos:");
		table.setModel(tableModel);	
		table.getColumnModel().getColumn(0).setPreferredWidth(200);
		table.getColumnModel().getColumn(1).setPreferredWidth(200);
		table.getColumnModel().getColumn(2).setWidth(10);
		table.getColumnModel().getColumn(3).setPreferredWidth(200);
		scrollPane.setVisible(true);	
		lblTabla.setVisible(true);
		table.getColumnModel().getColumn(2).setCellRenderer(centerRenderer);
	}

	public void cargarTablaConteoMiembros(){
		ArrayList<Candidato> candidatos = CE.getCandidatosActivos();
		Candidato[] valores = new Candidato[candidatos.size()];
		int i = 0;
		for (Candidato c: candidatos){
			valores[i] = c;
			i++;
		}
		tableModelMiembros = new TablaConteoMiembros(valores);
		lblTabla.setText("Conteo de votos por miembro:");
		table.setModel(tableModelMiembros);
		scrollPane.setVisible(true);	
		lblTabla.setVisible(true);
		table.getColumnModel().getColumn(0).setPreferredWidth(20);
		table.getColumnModel().getColumn(1).setPreferredWidth(20);
		table.getColumnModel().getColumn(2).setWidth(200);
		table.getColumnModel().getColumn(2).setCellRenderer(centerRenderer);

	}
	
	public void cargarTablaConteoPresidente(){
		ArrayList<Candidato> candidatos = CE.getCandidatosActivos();
		Candidato[] valores = new Candidato[candidatos.size()];
		int i = 0;
		for (Candidato c: candidatos){
			valores[i] = c;
			i++;
		}
		tableModelPresidentes = new TablaConteoPresidente(valores);
		lblTabla.setText("Conteo de votos por presidente:");
		table.setModel(tableModelPresidentes);
		scrollPane.setVisible(true);	
		lblTabla.setVisible(true);
		table.getColumnModel().getColumn(0).setPreferredWidth(20);
		table.getColumnModel().getColumn(1).setPreferredWidth(20);
		table.getColumnModel().getColumn(2).setWidth(200);
		table.getColumnModel().getColumn(2).setCellRenderer(centerRenderer);
	}

	public void TablaResultadosFinales(){		
		ArrayList<Candidato> candidatos = CE.getCandidatosActivos();
		Candidato[] valores = new Candidato[candidatos.size()];
		int i = 0;
		for (Candidato c : candidatos){
			valores[i] = c;	
			i++;
		}
		tableModelResultados = new TablaResultadoFinal(valores);
		lblTabla.setText("Resultados: ");
		table.setModel(tableModelResultados);	
		scrollPane.setVisible(true);	
		lblTabla.setVisible(true);	
		table.getColumnModel().getColumn(0).setPreferredWidth(300);
		table.getColumnModel().getColumn(1).setPreferredWidth(150);
		table.getColumnModel().getColumn(2).setWidth(100);
	}

	public boolean getEstadoVotacion ()
	{
		return votacionAbierta;
	}
}
