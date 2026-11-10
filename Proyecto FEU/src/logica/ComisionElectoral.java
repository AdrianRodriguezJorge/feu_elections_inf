package logica;
import java.util.ArrayList;

import interfaz.Principal;

public class ComisionElectoral {
	private ArrayList<Boleta> boletas;
	private ArrayList<Candidato> candidatosActivos;
	private ArrayList<Candidato> candidatosPosibles;
	private ArrayList <Usuario> usuarios;
	
	public ArrayList<Boleta> getBoletas() {
		return boletas;
	}
	public void setBoletas(ArrayList<Boleta> boletas) {
		this.boletas = boletas;
	}
	public ArrayList<Candidato> getCandidatosActivos() {
		return candidatosActivos;
	}
	public void setCandidatosActivos(ArrayList<Candidato> candidatosActivos) {
		this.candidatosActivos = candidatosActivos;
	}
	public ArrayList<Candidato> getCandidatosPosibles() {
		return candidatosPosibles;
	}
	public void setCandidatosPosibles(ArrayList<Candidato> candidatosPosibles) {
		this.candidatosPosibles = candidatosPosibles;
	}
	public ArrayList<Usuario> getUsuarios() {
		return usuarios;
	}
	public void setUsuarios(ArrayList<Usuario> usuarios) {
		this.usuarios = usuarios;
	}
	
	public ComisionElectoral() {
		boletas = new ArrayList<Boleta>();
		candidatosActivos = new ArrayList<Candidato>();
		candidatosPosibles = new ArrayList<Candidato>();
		usuarios = new ArrayList<Usuario>();
	}
	
	public int contarBoletasVal(){
		int cant = 0;
		for(Boleta b: boletas)
			if(b.getValidez())
				cant++;
		return cant;
	}
	
	public void conteoVotos () {
		for (Boleta b: boletas){
			if (b.getValidez() == true) 
			{
				int i=0;
				int [] seleccion = b.contarBoleta();
				for(Candidato c: candidatosActivos){
					if(seleccion[i] == 1){
						c.setcant_votos_miembro();
					}else if (seleccion[i] == 2){
						c.setcant_votos_miembro();
						c.setCant_votos_presidente();
					}
					i++;
				}
			}
			
		}
	}

	public boolean buscarCI (String ci, int indexActual)
	{
		boolean encontrado = false;

		for (int i = 0; i < candidatosActivos.size() && !encontrado; i++) 
		{
			if (candidatosActivos.get(i).getCI().equals(ci) && indexActual != i) 
			{
				encontrado = true;
			}
		}

		return encontrado;
	}

	public Boleta buscarBoleta(int codigo){
		int i;
		Boleta boleta = null;
		boolean encont = false;
		for(i=0;i<boletas.size()&& !encont;i++)
			if(boletas.get(i).getCodigo()==codigo){
				encont = true;
				boleta = boletas.get(i);
			}
		return boleta;
	}

	public void ordenarLstCandidatos ()
	{
		Candidato Presi = null;
		int mayor = -1, actual = 0;
		Candidato temp1 = null;
		Candidato temp2 = null;

		Principal.ordenarPor_apellidos = false;

		candidatosActivos.sort(null); // ordeno según la cantidad de votos por miembro
		temp1 = candidatosActivos.get(9); // guardo los 2 últimos para agregarlos nuevamete luego
		temp2 = candidatosActivos.get(10);
		candidatosActivos.remove(10); // luego elimino estos 2 candidatos con menor cantidad de estos
		candidatosActivos.remove(9);

		for (Candidato c : candidatosActivos) 
		{
			actual = c.getCant_votos_presidente();
			if (actual > mayor) 
			{
				mayor = actual;
				Presi = c;
			}
			else if (actual == mayor && c.getCant_votos_miembro() >= Presi.getCant_votos_miembro()) 
			{
				Presi = c;
			}
		}
		candidatosActivos.remove(Presi);
		candidatosActivos.add(0, Presi);
		candidatosActivos.add(temp1);
		candidatosActivos.add(temp2);
	}
	
}
