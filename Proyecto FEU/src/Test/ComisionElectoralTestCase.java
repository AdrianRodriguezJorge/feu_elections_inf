package Test;

import static org.junit.Assert.*;
import logica.Boleta;
import logica.ComisionElectoral;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;

public class ComisionElectoralTestCase {
	
	private ComisionElectoral ce;
	private Boleta b1;
	private Boleta b2;
	private Boleta b3;

	@Before
	public void setUp() throws Exception {
		ce = new ComisionElectoral ();
		b1 = new Boleta(1);
		b2 = new Boleta(2);
		b3 = new Boleta(3);
		
		
		ce.getBoletas().add(b1);
		ce.getBoletas().add(b2);
		ce.getBoletas().add(b3);
	}

	@After
	public void tearDown() throws Exception {
		ce = null;
	}
	
	//Datos de caja negra
	// 3 boletas válidas

	@Test
	public void testcontarBoletasVal() {
		assertEquals(3,ce.contarBoletasVal());
			
	}

	//Datos de caja negra
	// 2 boletas válidas y una inválida
	
    @Test
    public void testcontarBoletasInval1() {
    	b1.setValidez(false);
	    assertEquals(2,ce.contarBoletasVal());
	
    }
    
    //Datos de caja negra
    // 2 boletas inválidas y una válida
    
    @Test
    public void testcontarBoletasInval2() {
    	b1.setValidez(false);
    	b2.setValidez(false);
	    assertEquals(1,ce.contarBoletasVal());
	
    }
    
    //Datos de caja negra
    // una boleta que está en la lista
    
    @Test
    public void testbuscarBoleta(){
    	assertEquals(b1,ce.buscarBoleta(1));
    }
    
    //Datos de caja negra
    // una boleta que no está en la lista
    
    @Test
    public void testbuscarBoletaNo(){
    	assertEquals(null,ce.buscarBoleta(4));
    }
    
}
