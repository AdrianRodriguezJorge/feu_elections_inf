package logica;

import interfaz.Principal;

public class Candidato implements Comparable <Candidato>{
	private String nombre;
	private String apellidos;
	private String genero;
	private String CI;
	private String facultad;
	private int anno;
	private int brigada;
	private String descripcion;
	private int cant_votos_miembro;
	private int cant_votos_presidente;
	
	public String getNombre() {
		return nombre;
	}
	public void setNombre(String nombre) { 
		if (!(nombre.replaceAll(" ", "").equalsIgnoreCase("")) && !nombre.matches(".*\\d.*")) 
		{
			this.nombre = nombre;
		}
		else throw new IllegalArgumentException("El nombre no es válido.");
	}
	public String getApellidos() {
		return apellidos;
	}
	public void setApellidos(String apellidos) {
		if (!(apellidos.replaceAll(" ", "").equalsIgnoreCase("")) && !apellidos.matches(".*\\d.*")) 
		{
			this.apellidos = apellidos;
		}
		else throw new IllegalArgumentException("El apellido está vacio.");
	}
	public String getGenero() {
		return genero;
	}
	public void setGenero(String genero) {
		if(genero.equals("Femenino") || genero.equals("Masculino"))
			this.genero = genero;
		else
			throw new IllegalArgumentException("El género debe ser masculino o  femenino.");
	}
	public String getCI() {
		return CI;
	}
	public void setCI(String CI) {
		boolean esNumero = true;
		for(int i=0;i<CI.length() && esNumero;i++)
			if(!Character.isDigit(CI.charAt(i))){
				esNumero = false;
			}
		if (esNumero && CI.length()==11) {
			this.CI = CI;
		}
		else throw new IllegalArgumentException("Carnet de identidad no válido.");
		
	}
	public String getFacultad() {
		return facultad;
	}
	public void setFacultad(String facultad) {
		this.facultad = facultad;
	}
	public int getBrigada(){
		return brigada;
	}
	public void setBrigada(int brigada){
		if(brigada >= (anno*10+1) && brigada <= (anno*10+9)) {
			this.brigada = brigada;
		}
		else
			throw new IllegalArgumentException("La brigada no corresponde con el año escolar.");
	}
	
	public int getAnno() {
		return anno;
	}
	public void setAnno(int anno) {
		if(anno >= 1 && brigada <= 4) {
			this.anno = anno;
		}
		else
			throw new IllegalArgumentException("No es un año escolar válido.");
	}
	
	public String getDescripcion() {
		return descripcion;
	}
	public void setDescripcion(String descripcion) {
		this.descripcion = descripcion;
	}
	public int getCant_votos_miembro() {
		return cant_votos_miembro;
	}
	public void setcant_votos_miembro() {
		this.cant_votos_miembro ++;
	}
	public int getCant_votos_presidente() {
		return cant_votos_presidente;
	}
	public void setCant_votos_presidente() {
		this.cant_votos_presidente ++;
	}
	
	
	
	public Candidato(String nombre, String apellidos, String cI, String genero,
			String facultad, int anno, int brigada, String descripcion) {
		super();
		setNombre(nombre);
		setApellidos(apellidos);
		setGenero(genero);
		setCI(cI);
		setFacultad(facultad);
		setAnno(anno);
		setBrigada(brigada);
		setDescripcion(descripcion);
	}

	public Candidato ()
	{
		
	}
	
	@Override
	public String toString ()
	{
		return nombre + " " + apellidos;
	}

	public int compareTo(Candidato o) 
	{
		int i = 0;
		if (Principal.ordenarPor_apellidos)
		{
			i = this.getApellidos().compareTo(o.getApellidos());
			return i > 0 ? 1 : -1; 
		}
		else
		{
			if (this.cant_votos_miembro > o.cant_votos_miembro) 
			{
				i = -1;
			}
			else if (this.cant_votos_miembro == o.cant_votos_miembro) 
			{
				if (this.cant_votos_presidente > o.cant_votos_presidente) {
					i = -1;
				}
				else i = 1;
			}
			else i = 1;

			return i;
		}
	}
}
