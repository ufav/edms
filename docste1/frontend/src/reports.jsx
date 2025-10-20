import React from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

const data = Array.from({ length: 10 }, (_, index) => ({
  name: `Page ${index + 1}`,
  uv: Math.floor(Math.random() * 4000) + 1000,
  pv: Math.floor(Math.random() * 4000) + 1000,
  amt: Math.floor(Math.random() * 4000) + 1000,
}));

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const Reports = () => {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-around', padding: 24 }}>
      <LineChart
        width={500}
        height={300}
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="pv" stroke="#8884d8" activeDot={{ r: 8 }} />
        <Line type="monotone" dataKey="uv" stroke="#82ca9d" />
      </LineChart>

      <BarChart
        width={500}
        height={300}
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="pv" fill="#8884d8" />
        <Bar dataKey="uv" fill="#82ca9d" />
      </BarChart>

      <PieChart width={400} height={400}>
        <Pie
          data={data}
          cx={200}
          cy={200}
          innerRadius={60}
          outerRadius={80}
          fill="#8884d8"
          paddingAngle={5}
          dataKey="amt"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>

      <AreaChart
        width={500}
        height={300}
        data={data}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Area type="monotone" dataKey="uv" stroke="#8884d8" fill="#8884d8" />
      </AreaChart>

      <RadarChart
        cx={200}
        cy={200}
        outerRadius={150}
        width={500}
        height={400}
        data={data}
      >
        <PolarGrid />
        <PolarAngleAxis dataKey="name" />
        <PolarRadiusAxis />
        <Radar name="Mike" dataKey="pv" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
        <Radar name="Lily" dataKey="uv" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
        <Legend />
      </RadarChart>
    </div>
  );
};

export default Reports;
