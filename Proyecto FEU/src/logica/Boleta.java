package logica;
import java.util.ArrayList;
import java.util.Random;

public class Boleta {
	private int codigo;
	private boolean validez;
	private ArrayList<Linea_Boleta> lineas;
	
	public int getCodigo() {
		return codigo;
	}
	public void setCodigo(int codigo) {
		this.codigo = codigo;
	}
	public ArrayList<Linea_Boleta> getLineas() {
		return lineas;
	}
	public void setLineas(ArrayList<Linea_Boleta> lineas) {
		this.lineas = lineas;
	}
	
	public boolean getValidez() {
		return validez;
	}
	public void setValidez(boolean validez) {
		this.validez = validez;
	}
	
	public Boleta(int codigo) {
		validez = true;
		setCodigo(codigo);
		lineas = new ArrayList<Linea_Boleta>();
	}

	public int[] contarBoleta(){
		int [] seleccion = new int[11];
		int i = 0;
		for(Linea_Boleta x: lineas){
			if(x.esMiembro() == true) {
				if(x.esPresidente() == true){
					seleccion[i]=2;
				}
				else {
					seleccion[i]=1;
				}
			}
			else {
				seleccion[i]=0;
			}
			i++;
		}
		return seleccion;
	}
}
