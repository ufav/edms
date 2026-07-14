import * as React from 'react';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const faqItems = [
  {
    id: 'panel1',
    question: 'How do I contact customer support if I have a question or issue?',
    answer: (
      <>
        You can reach our support team by emailing&nbsp;
        <Link href="mailto:support@docste.com">support@docste.com</Link>
        &nbsp;or calling our toll-free number. We&apos;re here to assist you
        promptly.
      </>
    ),
  },
  {
    id: 'panel2',
    question: 'Can I try the system before buying?',
    answer:
      'Yes. There is a free plan and a guided demo, so you can evaluate the system on real tasks before moving to a paid plan.',
  },
  {
    id: 'panel3',
    question: 'What makes Docste different from other solutions?',
    answer:
      'Docste is built around real project document workflows: versioning, approval routes, transmittals and audit. We focus on usability and reliability.',
  },
  {
    id: 'panel4',
    question: 'How securely is the data stored?',
    answer:
      'Every action is recorded in the audit log, access is role-based, and data is protected at every stage. On-premise deployment in your own environment is also available.',
  },
];

export default function FAQ() {
  const [expanded, setExpanded] = React.useState<string[]>([]);

  const handleChange =
    (panel: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
      setExpanded(
        isExpanded
          ? [...expanded, panel]
          : expanded.filter((item) => item !== panel),
      );
    };

  return (
    <Container
      id="faq"
      sx={{
        pt: { xs: 4, sm: 12 },
        pb: { xs: 8, sm: 16 },
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: { xs: 3, sm: 6 },
      }}
    >
      <Typography
        component="h2"
        variant="h4"
        sx={{
          color: 'text.primary',
          width: { sm: '100%', md: '60%' },
          textAlign: { sm: 'left', md: 'center' },
        }}
      >
        Frequently asked questions
      </Typography>
      <Box sx={{ width: '100%' }}>
        {faqItems.map((item) => (
          <Accordion
            key={item.id}
            expanded={expanded.includes(item.id)}
            onChange={handleChange(item.id)}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls={`${item.id}d-content`}
              id={`${item.id}d-header`}
            >
              <Typography component="span" variant="subtitle2">
                {item.question}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography
                variant="body2"
                gutterBottom
                sx={{ maxWidth: { sm: '100%', md: '70%' } }}
              >
                {item.answer}
              </Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    </Container>
  );
}
