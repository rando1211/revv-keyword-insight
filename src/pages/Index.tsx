const Index = () => {
  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <h1 style={{ color: '#333', fontSize: '2rem', marginBottom: '20px' }}>
        REVV Marketing Dashboard
      </h1>
      
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h2 style={{ color: '#333', marginBottom: '10px' }}>✅ Dashboard is Working!</h2>
        <p style={{ color: '#666' }}>If you can see this, the app is loading correctly.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '20px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
          <h3 style={{ color: '#333', marginBottom: '10px' }}>Total Campaigns</h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2563eb' }}>24</div>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>+3 this month</p>
        </div>
        
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
          <h3 style={{ color: '#333', marginBottom: '10px' }}>Total Spend</h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#16a34a' }}>$47,892</div>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>+12% vs last month</p>
        </div>
      </div>

      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
        <h3 style={{ color: '#333', marginBottom: '15px' }}>🏢 Account Selection</h3>
        
        <div style={{ border: '1px solid #e5e5e5', borderRadius: '6px', padding: '15px', marginBottom: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ color: '#333', marginBottom: '5px' }}>Acme Corp - Main Account</h4>
              <p style={{ color: '#666', fontSize: '0.9rem', margin: 0 }}>Customer ID: 123-456-7890 • 8 campaigns</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#333' }}>$100</div>
              <div style={{ fontSize: '0.8rem', color: '#666' }}>per month</div>
            </div>
          </div>
        </div>
        
        <div style={{ border: '1px solid #e5e5e5', borderRadius: '6px', padding: '15px', marginBottom: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ color: '#333', marginBottom: '5px' }}>Acme Corp - Brand Campaigns</h4>
              <p style={{ color: '#666', fontSize: '0.9rem', margin: 0 }}>Customer ID: 123-456-7891 • 5 campaigns</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#333' }}>$100</div>
              <div style={{ fontSize: '0.8rem', color: '#666' }}>per month</div>
            </div>
          </div>
        </div>

        <button 
          style={{ 
            backgroundColor: '#2563eb', 
            color: 'white', 
            padding: '12px 24px', 
            border: 'none', 
            borderRadius: '6px', 
            fontSize: '1rem',
            cursor: 'pointer',
            width: '100%'
          }}
          onClick={() => alert('Account selection working!')}
        >
          Subscribe to Selected Accounts
        </button>
      </div>

      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #ddd', marginTop: '20px' }}>
        <h3 style={{ color: '#333', marginBottom: '15px' }}>📊 Top Spending Campaigns</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '15px' }}>
          <div style={{ border: '1px solid #e5e5e5', borderRadius: '6px', padding: '15px' }}>
            <h4 style={{ color: '#333', marginBottom: '10px' }}>Brand Awareness - Desktop</h4>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>Impressions:</span><span>1,250,000</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>Clicks:</span><span>45,600</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>CTR:</span><span>3.65%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Cost:</span><span style={{ fontWeight: 'bold', color: '#333' }}>$18,750</span>
              </div>
            </div>
          </div>
          
          <div style={{ border: '1px solid #e5e5e5', borderRadius: '6px', padding: '15px' }}>
            <h4 style={{ color: '#333', marginBottom: '10px' }}>Search - High Intent Keywords</h4>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>Impressions:</span><span>890,000</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>Clicks:</span><span>67,800</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>CTR:</span><span>7.62%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Cost:</span><span style={{ fontWeight: 'bold', color: '#333' }}>$15,421</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;