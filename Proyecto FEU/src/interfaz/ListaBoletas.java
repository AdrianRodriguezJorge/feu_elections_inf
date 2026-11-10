package interfaz;

import java.awt.BorderLayout;
import java.awt.FlowLayout;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;

import javax.swing.DefaultListModel;
import javax.swing.JButton;
import javax.swing.JDialog;
import javax.swing.JPanel;
import javax.swing.border.EmptyBorder;
import javax.swing.JList;

import logica.Boleta;
import logica.ComisionElectoral;
import java.awt.event.ActionListener;
import java.awt.event.ActionEvent;
import javax.swing.JTable;
import java.awt.Font;
import javax.swing.JScrollPane;
import javax.swing.border.MatteBorder;
import java.awt.Color;

public class ListaBoletas extends JDialog {

	private ComisionElectoral CE;
	private final JPanel contentPanel = new JPanel();
	private JList<Integer> listado;

	public ListaBoletas(DefaultListModel<Integer> lista,ComisionElectoral CE1) {
		setResizable(false);
		setFont(new Font("SansSerif", Font.PLAIN, 18));
		setTitle("Boletas");
		this.CE = CE1;
		CE.getCandidatosActivos().sort(null);
		setBounds(100, 100, 450, 349);
		getContentPane().setLayout(new BorderLayout());
		contentPanel.setBackground(new Color(143, 182, 155));
		contentPanel.setBorder(new EmptyBorder(5, 5, 5, 5));
		getContentPane().add(contentPanel, BorderLayout.CENTER);
		contentPanel.setLayout(null);
		{
			JButton cancelButton = new JButton("Atrás");
			cancelButton.setBackground(Color.WHITE);
			cancelButton.setBounds(341, 260, 88, 33);
			contentPanel.add(cancelButton);
			cancelButton.setFont(new Font("SansSerif", Font.PLAIN, 18));
			cancelButton.addActionListener(new ActionListener() {
				public void actionPerformed(ActionEvent e) {
					dispose();
				}
			});
			cancelButton.setActionCommand("Cancel");
		}
		
		JScrollPane scrollPane = new JScrollPane();
		scrollPane.setBounds(10, 10, 419, 243);
		contentPanel.add(scrollPane);
		
		listado = new JList<>(lista);
		listado.setBorder(new MatteBorder(5, 5, 5, 5, (Color) new Color(35, 83, 71)));
		scrollPane.setViewportView(listado);
		listado.setFont(new Font("SansSerif", Font.PLAIN, 18));
		listado.addMouseListener(new MouseAdapter(){
			public void mouseClicked(MouseEvent e){
				if(e.getClickCount() == 2){
					int ObjSelecionado = listado.getSelectedValue();
					Boleta boleta = CE.buscarBoleta(ObjSelecionado);
					MuestraBoleta mb = new MuestraBoleta(CE,boleta);
					mb.setModal(true);
					mb.setVisible(true);
				}
			}
		});
	}
}
